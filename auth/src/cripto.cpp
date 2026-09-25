#include "cripto.hpp"

#include <openssl/crypto.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/sha.h>

#include <sstream>
#include <stdexcept>
#include <vector>

namespace cripto {

namespace {

constexpr int TAMANHO_DO_SAL = 16;
constexpr int TAMANHO_DO_HASH = 32;
const std::string PREFIXO = "pbkdf2_sha256";

std::vector<unsigned char> bytes_aleatorios(int quantidade) {
    std::vector<unsigned char> saida(static_cast<size_t>(quantidade));
    if (RAND_bytes(saida.data(), quantidade) != 1) {
        throw std::runtime_error("Gerador aleatorio do OpenSSL indisponivel");
    }
    return saida;
}

std::string para_hex(const unsigned char* dados, size_t tamanho) {
    static const char* digitos = "0123456789abcdef";
    std::string saida;
    saida.reserve(tamanho * 2);
    for (size_t i = 0; i < tamanho; ++i) {
        saida.push_back(digitos[dados[i] >> 4]);
        saida.push_back(digitos[dados[i] & 0x0f]);
    }
    return saida;
}

std::vector<unsigned char> de_hex(const std::string& hex) {
    if (hex.size() % 2 != 0) {
        throw std::invalid_argument("hex com tamanho impar");
    }
    std::vector<unsigned char> saida;
    saida.reserve(hex.size() / 2);
    for (size_t i = 0; i < hex.size(); i += 2) {
        saida.push_back(static_cast<unsigned char>(std::stoi(hex.substr(i, 2), nullptr, 16)));
    }
    return saida;
}

std::vector<unsigned char> pbkdf2(const std::string& senha, const std::vector<unsigned char>& sal,
                                  int iteracoes) {
    std::vector<unsigned char> saida(TAMANHO_DO_HASH);
    int ok = PKCS5_PBKDF2_HMAC(senha.data(), static_cast<int>(senha.size()), sal.data(),
                               static_cast<int>(sal.size()), iteracoes, EVP_sha256(),
                               TAMANHO_DO_HASH, saida.data());
    if (ok != 1) {
        throw std::runtime_error("PBKDF2 falhou");
    }
    return saida;
}

}  // namespace

std::string hash_de_senha(const std::string& senha, int iteracoes) {
    auto sal = bytes_aleatorios(TAMANHO_DO_SAL);
    auto hash = pbkdf2(senha, sal, iteracoes);
    std::ostringstream saida;
    saida << PREFIXO << '$' << iteracoes << '$' << para_hex(sal.data(), sal.size()) << '$'
          << para_hex(hash.data(), hash.size());
    return saida.str();
}

bool senha_confere(const std::string& senha, const std::string& hash_gravado) {
    std::vector<std::string> partes;
    std::stringstream leitor(hash_gravado);
    std::string parte;
    while (std::getline(leitor, parte, '$')) {
        partes.push_back(parte);
    }
    if (partes.size() != 4 || partes[0] != PREFIXO) {
        return false;
    }
    try {
        int iteracoes = std::stoi(partes[1]);
        auto sal = de_hex(partes[2]);
        auto esperado = de_hex(partes[3]);
        auto calculado = pbkdf2(senha, sal, iteracoes);
        return esperado.size() == calculado.size() &&
               CRYPTO_memcmp(esperado.data(), calculado.data(), calculado.size()) == 0;
    } catch (const std::exception&) {
        return false;
    }
}

std::string token_aleatorio(int bytes) {
    auto dados = bytes_aleatorios(bytes);
    return para_hex(dados.data(), dados.size());
}

std::string codigo_numerico(int digitos) {
    std::string codigo;
    while (static_cast<int>(codigo.size()) < digitos) {
        // 250 e o maior multiplo de 10 que cabe num byte: descartar o resto evita vies.
        unsigned char byte = bytes_aleatorios(1)[0];
        if (byte < 250) {
            codigo.push_back(static_cast<char>('0' + byte % 10));
        }
    }
    return codigo;
}

std::string sha256_hex(const std::string& texto) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(texto.data()), texto.size(), hash);
    return para_hex(hash, sizeof(hash));
}

bool iguais_em_tempo_constante(const std::string& a, const std::string& b) {
    return a.size() == b.size() && CRYPTO_memcmp(a.data(), b.data(), a.size()) == 0;
}

}  // namespace cripto
