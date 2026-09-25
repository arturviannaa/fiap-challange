#pragma once

#include <string>
#include <vector>

#include "contas.hpp"
#include "recuperacao.hpp"

namespace httplib {
class Server;
}

// Liga os casos de uso ao HTTP. Toda resposta e JSON; erro sai como {"erro": "..."}.
namespace rotas {

void configurar_cors(httplib::Server& servidor, std::vector<std::string> origens_permitidas);
void registrar_saude(httplib::Server& servidor);
void registrar_conta(httplib::Server& servidor, Contas& contas);
void registrar_recuperacao(httplib::Server& servidor, Recuperacao& recuperacao, bool modo_demo);

}  // namespace rotas
