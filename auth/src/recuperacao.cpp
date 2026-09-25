#include "recuperacao.hpp"

#include "cripto.hpp"
#include "validacao.hpp"

namespace {
const std::string CODIGO_INVALIDO =
    "Código inválido ou expirado. Confira os 6 dígitos ou peça um código novo.";
}

Recuperacao::Recuperacao(Banco& banco, Contas& contas, Relogio relogio)
    : banco_(banco), contas_(contas), agora_(std::move(relogio)) {}

void Recuperacao::preparar() {
    banco_.executar_script(R"SQL(
        create table if not exists codigos_de_recuperacao (
            usuario_id  text primary key references usuarios (id) on delete cascade,
            codigo_hash text not null,
            criado_em   integer not null,
            expira_em   integer not null,
            tentativas  integer not null default 0
        );
    )SQL");
}

std::string Recuperacao::hash_do_codigo(const std::string& usuario_id,
                                        const std::string& codigo) const {
    // O id entra no hash: o mesmo codigo para duas pessoas gera hashes diferentes.
    return cripto::sha256_hex(usuario_id + ":" + codigo);
}

std::optional<std::string> Recuperacao::solicitar(const std::string& email) {
    if (auto erro = validacao::erro_no_email(email)) throw ErroDeConta(422, *erro);

    auto trava = banco_.travar();
    auto usuario = contas_.por_email(email);
    if (!usuario) {
        return std::nullopt;
    }
    std::string codigo = cripto::codigo_numerico(6);
    long long agora = agora_();
    // Um codigo por pessoa: pedir de novo substitui o anterior.
    banco_.executar(
        "insert into codigos_de_recuperacao (usuario_id, codigo_hash, criado_em, expira_em, "
        "tentativas) values (?, ?, ?, ?, 0) on conflict (usuario_id) do update set "
        "codigo_hash = excluded.codigo_hash, criado_em = excluded.criado_em, "
        "expira_em = excluded.expira_em, tentativas = 0",
        {usuario->id, hash_do_codigo(usuario->id, codigo), agora, agora + VALIDADE_DO_CODIGO});
    return codigo;
}

void Recuperacao::redefinir(const std::string& email, const std::string& codigo,
                            const std::string& nova_senha) {
    std::string limpo = validacao::aparar(codigo);
    if (limpo.size() != 6 || limpo.find_first_not_of("0123456789") != std::string::npos) {
        throw ErroDeConta(422, "O código tem 6 números.");
    }
    if (auto erro = validacao::erro_na_senha(nova_senha)) throw ErroDeConta(422, *erro);

    auto trava = banco_.travar();
    auto usuario = contas_.por_email(email);
    if (!usuario) {
        throw ErroDeConta(400, CODIGO_INVALIDO);
    }
    auto linhas = banco_.consultar(
        "select codigo_hash, expira_em, tentativas from codigos_de_recuperacao "
        "where usuario_id = ?",
        {usuario->id});
    if (linhas.empty() || Banco::inteiro(linhas[0], "expira_em") <= agora_() ||
        Banco::inteiro(linhas[0], "tentativas") >= TENTATIVAS_POR_CODIGO) {
        throw ErroDeConta(400, CODIGO_INVALIDO);
    }
    if (!cripto::iguais_em_tempo_constante(Banco::texto(linhas[0], "codigo_hash"),
                                           hash_do_codigo(usuario->id, limpo))) {
        banco_.executar(
            "update codigos_de_recuperacao set tentativas = tentativas + 1 where usuario_id = ?",
            {usuario->id});
        throw ErroDeConta(400, CODIGO_INVALIDO);
    }

    contas_.trocar_senha(usuario->id, nova_senha);
    banco_.executar("delete from codigos_de_recuperacao where usuario_id = ?", {usuario->id});
    // Quem acabou de provar que e dono do e-mail nao continua bloqueado.
    banco_.executar("delete from tentativas_de_login where email = ?", {usuario->email});
}
