#pragma once

#include <string>
#include <vector>

#include "contas.hpp"

namespace httplib {
class Server;
}

// Liga os casos de uso ao HTTP. Toda resposta e JSON; erro sai como {"erro": "..."}.
namespace rotas {

void configurar_cors(httplib::Server& servidor, std::vector<std::string> origens_permitidas);
void registrar_saude(httplib::Server& servidor);
void registrar_conta(httplib::Server& servidor, Contas& contas);

}  // namespace rotas
