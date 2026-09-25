#include "validacao.hpp"

#include <algorithm>
#include <cctype>
#include <regex>

namespace validacao {

namespace {

constexpr size_t NOME_MINIMO = 2;
constexpr size_t NOME_MAXIMO = 80;
constexpr size_t EMAIL_MAXIMO = 254;
constexpr size_t SENHA_MINIMA = 8;
constexpr size_t SENHA_MAXIMA = 128;

// Conta caracteres, nao bytes: "Assumpção" tem 9 letras e 11 bytes em UTF-8.
size_t tamanho_utf8(const std::string& texto) {
    return static_cast<size_t>(std::count_if(texto.begin(), texto.end(), [](char c) {
        return (static_cast<unsigned char>(c) & 0xC0) != 0x80;
    }));
}

}  // namespace

std::string aparar(const std::string& texto) {
    auto inicio = texto.find_first_not_of(" \t\r\n");
    if (inicio == std::string::npos) {
        return "";
    }
    auto fim = texto.find_last_not_of(" \t\r\n");
    return texto.substr(inicio, fim - inicio + 1);
}

std::string normalizar_email(const std::string& email) {
    std::string saida = aparar(email);
    std::transform(saida.begin(), saida.end(), saida.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return saida;
}

std::optional<std::string> erro_no_nome(const std::string& nome) {
    auto tamanho = tamanho_utf8(aparar(nome));
    if (tamanho < NOME_MINIMO) {
        return "Informe seu nome.";
    }
    if (tamanho > NOME_MAXIMO) {
        return "O nome pode ter até 80 caracteres.";
    }
    return std::nullopt;
}

std::optional<std::string> erro_no_email(const std::string& email) {
    static const std::regex formato(R"(^[a-z0-9._%+\-]+@[a-z0-9\-]+(\.[a-z0-9\-]+)*\.[a-z]{2,}$)");
    std::string normalizado = normalizar_email(email);
    if (normalizado.empty()) {
        return "Informe seu e-mail.";
    }
    if (normalizado.size() > EMAIL_MAXIMO || !std::regex_match(normalizado, formato)) {
        return "Esse e-mail não parece válido. Confira se tem @ e domínio, como nome@exemplo.com.";
    }
    return std::nullopt;
}

std::optional<std::string> erro_na_senha(const std::string& senha) {
    if (senha.size() < SENHA_MINIMA) {
        return "A senha precisa de pelo menos 8 caracteres.";
    }
    if (senha.size() > SENHA_MAXIMA) {
        return "A senha pode ter até 128 caracteres.";
    }
    bool tem_letra = std::any_of(senha.begin(), senha.end(),
                                 [](unsigned char c) { return std::isalpha(c) || c >= 0x80; });
    bool tem_digito = std::any_of(senha.begin(), senha.end(),
                                  [](unsigned char c) { return std::isdigit(c); });
    if (!tem_letra || !tem_digito) {
        return "Use letras e números na senha.";
    }
    return std::nullopt;
}

}  // namespace validacao
