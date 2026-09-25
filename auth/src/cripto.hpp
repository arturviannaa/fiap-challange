#pragma once

#include <string>

// Tudo o que envolve segredo passa por aqui: hash de senha, tokens de sessao e
// codigos de recuperacao. A implementacao usa a libcrypto do OpenSSL; nada de
// algoritmo caseiro.
namespace cripto {

// PBKDF2-HMAC-SHA256 com sal aleatorio de 16 bytes. O resultado e uma string
// autodescritiva: "pbkdf2_sha256$<iteracoes>$<sal hex>$<hash hex>".
std::string hash_de_senha(const std::string& senha, int iteracoes = 210000);

// Recalcula o hash com o sal e as iteracoes gravados e compara em tempo constante.
bool senha_confere(const std::string& senha, const std::string& hash_gravado);

// Token de sessao: 32 bytes aleatorios em hex (64 caracteres).
std::string token_aleatorio(int bytes = 32);

// Codigo numerico de N digitos, sem vies de modulo.
std::string codigo_numerico(int digitos = 6);

std::string sha256_hex(const std::string& texto);

bool iguais_em_tempo_constante(const std::string& a, const std::string& b);

}  // namespace cripto
