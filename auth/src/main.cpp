#include <httplib.h>

#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <sstream>

#include "banco.hpp"
#include "contas.hpp"
#include "rotas.hpp"

namespace {

std::string variavel(const char* nome, const std::string& padrao) {
    const char* valor = std::getenv(nome);
    return (valor && *valor) ? valor : padrao;
}

std::vector<std::string> separar(const std::string& texto, char separador) {
    std::vector<std::string> partes;
    std::stringstream leitor(texto);
    std::string parte;
    while (std::getline(leitor, parte, separador)) {
        if (!parte.empty()) partes.push_back(parte);
    }
    return partes;
}

}  // namespace

int main() {
    const std::string caminho_do_banco = variavel("BANCO", "var/auth.db");
    const int porta = std::stoi(variavel("PORTA", "8092"));
    const auto origens = separar(
        variavel("ORIGENS", "http://localhost:8080,http://127.0.0.1:8080"), ',');

    std::filesystem::path pasta = std::filesystem::path(caminho_do_banco).parent_path();
    if (!pasta.empty()) std::filesystem::create_directories(pasta);

    Banco banco(caminho_do_banco);
    Contas contas(banco);
    contas.preparar();

    httplib::Server servidor;
    servidor.set_payload_max_length(16 * 1024);
    servidor.set_logger([](const httplib::Request& req, const httplib::Response& res) {
        std::cout << req.method << ' ' << req.path << ' ' << res.status << std::endl;
    });

    rotas::configurar_cors(servidor, origens);
    rotas::registrar_saude(servidor);
    rotas::registrar_conta(servidor, contas);

    std::cout << "auth ouvindo na porta " << porta << std::endl;
    if (!servidor.listen("0.0.0.0", porta)) {
        std::cerr << "Nao foi possivel abrir a porta " << porta << std::endl;
        return 1;
    }
    return 0;
}
