#pragma once

#include <functional>
#include <optional>
#include <stdexcept>
#include <string>

#include "banco.hpp"

// Erro de regra de negocio: carrega o status HTTP e a frase que o usuario le.
class ErroDeConta : public std::runtime_error {
public:
    ErroDeConta(int status, const std::string& mensagem)
        : std::runtime_error(mensagem), status_(status) {}
    int status() const { return status_; }

private:
    int status_;
};

struct Usuario {
    std::string id;
    std::string nome;
    std::string email;
    long long criado_em = 0;
};

struct Sessao {
    std::string token;
    long long expira_em = 0;
    Usuario usuario;
};

using Relogio = std::function<long long()>;

Relogio relogio_do_sistema();

// Cadastro, login, sessao e logout. A senha nunca sai daqui em texto: entra,
// vira hash PBKDF2 e so o hash vai para o banco. O token de sessao tambem e
// gravado como SHA-256 — quem ler o banco nao consegue se passar por ninguem.
class Contas {
public:
    static constexpr long long DURACAO_DA_SESSAO = 7 * 24 * 60 * 60;
    static constexpr int FALHAS_ATE_BLOQUEIO = 5;
    static constexpr long long DURACAO_DO_BLOQUEIO = 5 * 60;

    Contas(Banco& banco, Relogio relogio = relogio_do_sistema(), int iteracoes_do_hash = 210000);

    void preparar();

    Usuario cadastrar(const std::string& nome, const std::string& email, const std::string& senha);
    Sessao entrar(const std::string& email, const std::string& senha);
    std::optional<Usuario> usuario_da_sessao(const std::string& token);
    void sair(const std::string& token);

    std::optional<Usuario> por_email(const std::string& email);

    // Troca a senha e derruba todas as sessoes abertas do usuario.
    void trocar_senha(const std::string& usuario_id, const std::string& nova_senha);

private:
    Usuario de_linha(const Banco::Linha& linha) const;
    void registrar_falha(const std::string& email);
    void exigir_desbloqueado(const std::string& email);

    Banco& banco_;
    Relogio agora_;
    int iteracoes_;
    std::string hash_de_referencia_;
};
