#include "contas.hpp"

#include <chrono>

#include "cripto.hpp"
#include "validacao.hpp"

Relogio relogio_do_sistema() {
    return [] {
        return static_cast<long long>(std::chrono::duration_cast<std::chrono::seconds>(
                                          std::chrono::system_clock::now().time_since_epoch())
                                          .count());
    };
}

Contas::Contas(Banco& banco, Relogio relogio, int iteracoes_do_hash)
    : banco_(banco), agora_(std::move(relogio)), iteracoes_(iteracoes_do_hash) {
    // Hash descartavel usado quando o e-mail nao existe: o login leva o mesmo
    // tempo com ou sem conta, e o tempo de resposta nao entrega quem e aluno.
    hash_de_referencia_ = cripto::hash_de_senha(cripto::token_aleatorio(8), iteracoes_);
}

void Contas::preparar() {
    banco_.executar_script(R"SQL(
        create table if not exists usuarios (
            id         text primary key,
            nome       text not null,
            email      text not null unique,
            senha_hash text not null,
            criado_em  integer not null
        );
        create table if not exists sessoes (
            token_hash text primary key,
            usuario_id text not null references usuarios (id) on delete cascade,
            criada_em  integer not null,
            expira_em  integer not null
        );
        create index if not exists idx_sessoes_usuario on sessoes (usuario_id);
        create table if not exists tentativas_de_login (
            email         text primary key,
            falhas        integer not null,
            bloqueado_ate integer not null
        );
    )SQL");
}

Usuario Contas::de_linha(const Banco::Linha& linha) const {
    return Usuario{Banco::texto(linha, "id"), Banco::texto(linha, "nome"),
                   Banco::texto(linha, "email"), Banco::inteiro(linha, "criado_em")};
}

Usuario Contas::cadastrar(const std::string& nome, const std::string& email,
                          const std::string& senha) {
    if (auto erro = validacao::erro_no_nome(nome)) throw ErroDeConta(422, *erro);
    if (auto erro = validacao::erro_no_email(email)) throw ErroDeConta(422, *erro);
    if (auto erro = validacao::erro_na_senha(senha)) throw ErroDeConta(422, *erro);

    std::string normalizado = validacao::normalizar_email(email);
    std::string hash = cripto::hash_de_senha(senha, iteracoes_);

    auto trava = banco_.travar();
    if (por_email(normalizado)) {
        throw ErroDeConta(409, "Já existe uma conta com esse e-mail. Entre ou recupere a senha.");
    }
    Usuario usuario{cripto::token_aleatorio(16), validacao::aparar(nome), normalizado, agora_()};
    banco_.executar(
        "insert into usuarios (id, nome, email, senha_hash, criado_em) values (?, ?, ?, ?, ?)",
        {usuario.id, usuario.nome, usuario.email, hash, usuario.criado_em});
    return usuario;
}

void Contas::exigir_desbloqueado(const std::string& email) {
    auto linhas = banco_.consultar(
        "select bloqueado_ate from tentativas_de_login where email = ?", {email});
    if (linhas.empty()) {
        return;
    }
    long long restante = Banco::inteiro(linhas[0], "bloqueado_ate") - agora_();
    if (restante > 0) {
        long long minutos = (restante + 59) / 60;
        throw ErroDeConta(429, "Muitas tentativas erradas. Tente de novo em " +
                                   std::to_string(minutos) +
                                   (minutos == 1 ? " minuto" : " minutos") +
                                   " ou recupere a senha.");
    }
}

void Contas::registrar_falha(const std::string& email) {
    auto linhas =
        banco_.consultar("select falhas from tentativas_de_login where email = ?", {email});
    long long falhas = linhas.empty() ? 1 : Banco::inteiro(linhas[0], "falhas") + 1;
    long long bloqueado_ate = 0;
    if (falhas >= FALHAS_ATE_BLOQUEIO) {
        bloqueado_ate = agora_() + DURACAO_DO_BLOQUEIO;
        falhas = 0;
    }
    banco_.executar(
        "insert into tentativas_de_login (email, falhas, bloqueado_ate) values (?, ?, ?) "
        "on conflict (email) do update set falhas = excluded.falhas, "
        "bloqueado_ate = excluded.bloqueado_ate",
        {email, falhas, bloqueado_ate});
}

Sessao Contas::entrar(const std::string& email, const std::string& senha) {
    std::string normalizado = validacao::normalizar_email(email);
    if (normalizado.empty() || senha.empty()) {
        throw ErroDeConta(422, "Informe e-mail e senha.");
    }

    auto trava = banco_.travar();
    exigir_desbloqueado(normalizado);

    auto linhas = banco_.consultar(
        "select id, nome, email, criado_em, senha_hash from usuarios where email = ?",
        {normalizado});
    std::string hash = linhas.empty() ? hash_de_referencia_ : Banco::texto(linhas[0], "senha_hash");
    bool confere = cripto::senha_confere(senha, hash);
    if (linhas.empty() || !confere) {
        registrar_falha(normalizado);
        throw ErroDeConta(401, "E-mail ou senha incorretos.");
    }
    banco_.executar("delete from tentativas_de_login where email = ?", {normalizado});

    Sessao sessao;
    sessao.usuario = de_linha(linhas[0]);
    sessao.token = cripto::token_aleatorio();
    sessao.expira_em = agora_() + DURACAO_DA_SESSAO;
    banco_.executar(
        "insert into sessoes (token_hash, usuario_id, criada_em, expira_em) values (?, ?, ?, ?)",
        {cripto::sha256_hex(sessao.token), sessao.usuario.id, agora_(), sessao.expira_em});
    return sessao;
}

std::optional<Usuario> Contas::usuario_da_sessao(const std::string& token) {
    if (token.empty()) {
        return std::nullopt;
    }
    auto linhas = banco_.consultar(
        "select u.id, u.nome, u.email, u.criado_em from sessoes s "
        "join usuarios u on u.id = s.usuario_id "
        "where s.token_hash = ? and s.expira_em > ?",
        {cripto::sha256_hex(token), agora_()});
    if (linhas.empty()) {
        return std::nullopt;
    }
    return de_linha(linhas[0]);
}

void Contas::sair(const std::string& token) {
    banco_.executar("delete from sessoes where token_hash = ?", {cripto::sha256_hex(token)});
}

std::optional<Usuario> Contas::por_email(const std::string& email) {
    auto linhas = banco_.consultar(
        "select id, nome, email, criado_em from usuarios where email = ?",
        {validacao::normalizar_email(email)});
    if (linhas.empty()) {
        return std::nullopt;
    }
    return de_linha(linhas[0]);
}

void Contas::trocar_senha(const std::string& usuario_id, const std::string& nova_senha) {
    if (auto erro = validacao::erro_na_senha(nova_senha)) throw ErroDeConta(422, *erro);
    std::string hash = cripto::hash_de_senha(nova_senha, iteracoes_);
    auto trava = banco_.travar();
    banco_.executar("update usuarios set senha_hash = ? where id = ?", {hash, usuario_id});
    banco_.executar("delete from sessoes where usuario_id = ?", {usuario_id});
}
