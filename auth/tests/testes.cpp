// Testes do servico de autenticacao, sem framework: cada caso e uma funcao, e
// o executavel sai com codigo 1 se algum falhar (e assim que o ctest le).
#include <functional>
#include <iostream>
#include <string>
#include <vector>

#include "banco.hpp"
#include "contas.hpp"
#include "cripto.hpp"
#include "recuperacao.hpp"
#include "validacao.hpp"

namespace {

int falhas = 0;
std::vector<std::pair<std::string, std::function<void()>>> casos;

struct Registro {
    Registro(const std::string& nome, std::function<void()> corpo) {
        casos.emplace_back(nome, std::move(corpo));
    }
};

#define CASO(nome)                                  \
    void nome();                                    \
    Registro registro_##nome(#nome, nome);          \
    void nome()

#define CONFERIR(condicao)                                                               \
    do {                                                                                 \
        if (!(condicao)) {                                                               \
            throw std::runtime_error(std::string("falhou: ") + #condicao + " (linha " + \
                                     std::to_string(__LINE__) + ")");                   \
        }                                                                                \
    } while (0)

// Espera que a expressao lance ErroDeConta com o status dado.
#define CONFERIR_ERRO(status_esperado, expressao)                          \
    do {                                                                   \
        bool lancou = false;                                               \
        try {                                                              \
            expressao;                                                     \
        } catch (const ErroDeConta& erro) {                                \
            lancou = true;                                                 \
            CONFERIR(erro.status() == (status_esperado));                  \
        }                                                                  \
        CONFERIR(lancou);                                                  \
    } while (0)

// Ambiente isolado: banco em memoria, relogio controlado e hash barato.
struct Ambiente {
    long long agora = 1'800'000'000;
    Banco banco{":memory:"};
    Contas contas{banco, [this] { return agora; }, 1000};
    Recuperacao recuperacao{banco, contas, [this] { return agora; }};

    Ambiente() {
        contas.preparar();
        recuperacao.preparar();
    }
};

// ---------- cripto ----------

CASO(hash_de_senha_confere_com_a_senha_certa) {
    auto hash = cripto::hash_de_senha("segredo123", 1000);
    CONFERIR(hash.rfind("pbkdf2_sha256$1000$", 0) == 0);
    CONFERIR(cripto::senha_confere("segredo123", hash));
    CONFERIR(!cripto::senha_confere("segredo124", hash));
}

CASO(mesma_senha_gera_hashes_diferentes) {
    CONFERIR(cripto::hash_de_senha("segredo123", 1000) != cripto::hash_de_senha("segredo123", 1000));
}

CASO(hash_malformado_nao_confere) {
    CONFERIR(!cripto::senha_confere("x", ""));
    CONFERIR(!cripto::senha_confere("x", "md5$1$aa$bb"));
    CONFERIR(!cripto::senha_confere("x", "pbkdf2_sha256$abc$zz$yy"));
}

CASO(token_e_codigo_tem_o_formato_esperado) {
    CONFERIR(cripto::token_aleatorio().size() == 64);
    auto codigo = cripto::codigo_numerico(6);
    CONFERIR(codigo.size() == 6);
    CONFERIR(codigo.find_first_not_of("0123456789") == std::string::npos);
}

CASO(sha256_bate_com_o_vetor_conhecido) {
    CONFERIR(cripto::sha256_hex("abc") ==
             "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
}

// ---------- validacao ----------

CASO(email_e_normalizado_e_validado) {
    CONFERIR(validacao::normalizar_email("  Pedro@FIAP.com.br ") == "pedro@fiap.com.br");
    CONFERIR(!validacao::erro_no_email("aluno@fiap.com.br"));
    CONFERIR(validacao::erro_no_email("sem-arroba.com"));
    CONFERIR(validacao::erro_no_email("a@b"));
    CONFERIR(validacao::erro_no_email(""));
}

CASO(senha_exige_tamanho_letra_e_numero) {
    CONFERIR(validacao::erro_na_senha("curta1"));
    CONFERIR(validacao::erro_na_senha("somenteletras"));
    CONFERIR(validacao::erro_na_senha("12345678"));
    CONFERIR(!validacao::erro_na_senha("anamnea2026"));
}

CASO(nome_conta_caracteres_e_nao_bytes) {
    CONFERIR(!validacao::erro_no_nome("Cassiano Rocha Assumpção"));
    CONFERIR(validacao::erro_no_nome(" "));
    CONFERIR(validacao::erro_no_nome(std::string(81, 'a')));
    CONFERIR(!validacao::erro_no_nome(std::string(40, 'a') + std::string(40, 'a')));
}

// ---------- contas ----------

CASO(cadastro_e_login_devolvem_sessao_valida) {
    Ambiente amb;
    auto usuario = amb.contas.cadastrar("Artur", "Artur@Exemplo.com", "anamnea2026");
    CONFERIR(usuario.email == "artur@exemplo.com");
    auto sessao = amb.contas.entrar("artur@exemplo.com", "anamnea2026");
    auto dono = amb.contas.usuario_da_sessao(sessao.token);
    CONFERIR(dono && dono->id == usuario.id);
}

CASO(email_repetido_e_recusado) {
    Ambiente amb;
    amb.contas.cadastrar("Pedro", "pedro@exemplo.com", "anamnea2026");
    CONFERIR_ERRO(409, amb.contas.cadastrar("Outro", "PEDRO@exemplo.com", "anamnea2026"));
}

CASO(senha_errada_e_email_inexistente_dao_a_mesma_resposta) {
    Ambiente amb;
    amb.contas.cadastrar("Cassiano", "cassiano@exemplo.com", "anamnea2026");
    CONFERIR_ERRO(401, amb.contas.entrar("cassiano@exemplo.com", "errada123"));
    CONFERIR_ERRO(401, amb.contas.entrar("ninguem@exemplo.com", "errada123"));
}

CASO(sessao_expira_e_logout_derruba) {
    Ambiente amb;
    amb.contas.cadastrar("Artur", "artur@exemplo.com", "anamnea2026");
    auto sessao = amb.contas.entrar("artur@exemplo.com", "anamnea2026");
    amb.contas.sair(sessao.token);
    CONFERIR(!amb.contas.usuario_da_sessao(sessao.token));

    auto outra = amb.contas.entrar("artur@exemplo.com", "anamnea2026");
    amb.agora += Contas::DURACAO_DA_SESSAO + 1;
    CONFERIR(!amb.contas.usuario_da_sessao(outra.token));
}

CASO(cinco_erros_bloqueiam_o_login_por_cinco_minutos) {
    Ambiente amb;
    amb.contas.cadastrar("Pedro", "pedro@exemplo.com", "anamnea2026");
    for (int i = 0; i < Contas::FALHAS_ATE_BLOQUEIO; ++i) {
        CONFERIR_ERRO(401, amb.contas.entrar("pedro@exemplo.com", "errada123"));
    }
    // Bloqueado: nem a senha certa entra.
    CONFERIR_ERRO(429, amb.contas.entrar("pedro@exemplo.com", "anamnea2026"));
    amb.agora += Contas::DURACAO_DO_BLOQUEIO;
    CONFERIR(!amb.contas.entrar("pedro@exemplo.com", "anamnea2026").token.empty());
}

// ---------- recuperacao ----------

CASO(recuperacao_troca_a_senha_e_derruba_sessoes) {
    Ambiente amb;
    amb.contas.cadastrar("Artur", "artur@exemplo.com", "anamnea2026");
    auto antiga = amb.contas.entrar("artur@exemplo.com", "anamnea2026");

    auto codigo = amb.recuperacao.solicitar("artur@exemplo.com");
    CONFERIR(codigo && codigo->size() == 6);
    amb.recuperacao.redefinir("artur@exemplo.com", *codigo, "novasenha99");

    CONFERIR(!amb.contas.usuario_da_sessao(antiga.token));
    CONFERIR_ERRO(401, amb.contas.entrar("artur@exemplo.com", "anamnea2026"));
    CONFERIR(!amb.contas.entrar("artur@exemplo.com", "novasenha99").token.empty());
    // O codigo e de uso unico.
    CONFERIR_ERRO(400, amb.recuperacao.redefinir("artur@exemplo.com", *codigo, "outrasenha1"));
}

CASO(email_sem_conta_nao_gera_codigo) {
    Ambiente amb;
    CONFERIR(!amb.recuperacao.solicitar("ninguem@exemplo.com"));
}

CASO(codigo_expira_em_quinze_minutos) {
    Ambiente amb;
    amb.contas.cadastrar("Pedro", "pedro@exemplo.com", "anamnea2026");
    auto codigo = amb.recuperacao.solicitar("pedro@exemplo.com");
    amb.agora += Recuperacao::VALIDADE_DO_CODIGO;
    CONFERIR_ERRO(400, amb.recuperacao.redefinir("pedro@exemplo.com", *codigo, "novasenha99"));
}

CASO(cinco_codigos_errados_invalidam_o_codigo) {
    Ambiente amb;
    amb.contas.cadastrar("Cassiano", "cassiano@exemplo.com", "anamnea2026");
    auto codigo = amb.recuperacao.solicitar("cassiano@exemplo.com");
    std::string errado = (*codigo == "000000") ? "111111" : "000000";
    for (int i = 0; i < Recuperacao::TENTATIVAS_POR_CODIGO; ++i) {
        CONFERIR_ERRO(400, amb.recuperacao.redefinir("cassiano@exemplo.com", errado, "novasenha99"));
    }
    CONFERIR_ERRO(400, amb.recuperacao.redefinir("cassiano@exemplo.com", *codigo, "novasenha99"));
}

CASO(recuperar_a_senha_libera_o_bloqueio_de_login) {
    Ambiente amb;
    amb.contas.cadastrar("Pedro", "pedro@exemplo.com", "anamnea2026");
    for (int i = 0; i < Contas::FALHAS_ATE_BLOQUEIO; ++i) {
        CONFERIR_ERRO(401, amb.contas.entrar("pedro@exemplo.com", "errada123"));
    }
    auto codigo = amb.recuperacao.solicitar("pedro@exemplo.com");
    amb.recuperacao.redefinir("pedro@exemplo.com", *codigo, "novasenha99");
    CONFERIR(!amb.contas.entrar("pedro@exemplo.com", "novasenha99").token.empty());
}

}  // namespace

int main() {
    for (const auto& [nome, corpo] : casos) {
        try {
            corpo();
            std::cout << "  ok     " << nome << '\n';
        } catch (const std::exception& erro) {
            ++falhas;
            std::cout << "  FALHOU " << nome << ": " << erro.what() << '\n';
        }
    }
    std::cout << '\n' << casos.size() - falhas << '/' << casos.size() << " casos passaram\n";
    return falhas == 0 ? 0 : 1;
}
