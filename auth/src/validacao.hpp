#pragma once

#include <optional>
#include <string>

// Regras de formato dos campos de conta. Cada funcao devolve a mensagem de erro
// que vai para o usuario, ou nada quando o valor passa.
namespace validacao {

std::string normalizar_email(const std::string& email);
std::string aparar(const std::string& texto);

std::optional<std::string> erro_no_nome(const std::string& nome);
std::optional<std::string> erro_no_email(const std::string& email);
std::optional<std::string> erro_na_senha(const std::string& senha);

}  // namespace validacao
