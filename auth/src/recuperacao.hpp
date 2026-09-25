#pragma once

#include <optional>
#include <string>

#include "banco.hpp"
#include "contas.hpp"

// Recuperacao de senha por codigo de 6 digitos.
//
// O pedido nunca diz se o e-mail existe: a resposta e a mesma nos dois casos,
// para que a tela de recuperacao nao vire um jeito de descobrir quem tem conta.
// O codigo vale 15 minutos, aceita 5 tentativas e e gravado so como hash.
class Recuperacao {
public:
    static constexpr long long VALIDADE_DO_CODIGO = 15 * 60;
    static constexpr int TENTATIVAS_POR_CODIGO = 5;

    Recuperacao(Banco& banco, Contas& contas, Relogio relogio = relogio_do_sistema());

    void preparar();

    // Devolve o codigo gerado quando o e-mail tem conta. Quem chama decide o
    // que fazer com ele (enviar por e-mail, ou mostrar no modo demonstracao).
    std::optional<std::string> solicitar(const std::string& email);

    void redefinir(const std::string& email, const std::string& codigo,
                   const std::string& nova_senha);

private:
    std::string hash_do_codigo(const std::string& usuario_id, const std::string& codigo) const;

    Banco& banco_;
    Contas& contas_;
    Relogio agora_;
};
