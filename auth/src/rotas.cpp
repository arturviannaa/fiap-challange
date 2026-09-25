#include "rotas.hpp"

#include <httplib.h>

#include <algorithm>
#include <iostream>
#include <optional>
#include <nlohmann/json.hpp>

using nlohmann::json;

namespace rotas {

namespace {

void responder(httplib::Response& res, int status, const json& corpo) {
    res.status = status;
    res.set_content(corpo.dump(), "application/json; charset=utf-8");
}

void responder_erro(httplib::Response& res, int status, const std::string& mensagem) {
    responder(res, status, json{{"erro", mensagem}});
}

// Le o corpo JSON; devolve nulo (e ja responde 400) quando nao e um objeto.
std::optional<json> corpo_json(const httplib::Request& req, httplib::Response& res) {
    auto corpo = json::parse(req.body, nullptr, false);
    if (corpo.is_discarded() || !corpo.is_object()) {
        responder_erro(res, 400, "Corpo da requisição precisa ser um JSON válido.");
        return std::nullopt;
    }
    return corpo;
}

std::string campo(const json& corpo, const char* nome) {
    auto it = corpo.find(nome);
    return (it != corpo.end() && it->is_string()) ? it->get<std::string>() : "";
}

std::string token_do_cabecalho(const httplib::Request& req) {
    const std::string prefixo = "Bearer ";
    auto valor = req.get_header_value("Authorization");
    return valor.rfind(prefixo, 0) == 0 ? valor.substr(prefixo.size()) : "";
}

json usuario_json(const Usuario& usuario) {
    return {{"id", usuario.id},
            {"nome", usuario.nome},
            {"email", usuario.email},
            {"criado_em", usuario.criado_em}};
}

// Executa o caso de uso e traduz as excecoes em resposta HTTP.
template <typename Acao>
void tratar(httplib::Response& res, Acao&& acao) {
    try {
        acao();
    } catch (const ErroDeConta& erro) {
        responder_erro(res, erro.status(), erro.what());
    } catch (const std::exception& erro) {
        std::cerr << "[erro] " << erro.what() << std::endl;
        responder_erro(res, 500, "Erro interno. Tente de novo em instantes.");
    }
}

}  // namespace

void configurar_cors(httplib::Server& servidor, std::vector<std::string> origens_permitidas) {
    servidor.set_post_routing_handler([origens_permitidas](const httplib::Request& req,
                                                           httplib::Response& res) {
        auto origem = req.get_header_value("Origin");
        if (!origem.empty() && std::find(origens_permitidas.begin(), origens_permitidas.end(),
                                         origem) != origens_permitidas.end()) {
            res.set_header("Access-Control-Allow-Origin", origem);
            res.set_header("Vary", "Origin");
            res.set_header("Access-Control-Allow-Headers", "Authorization, Content-Type");
            res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.set_header("Access-Control-Max-Age", "600");
        }
    });
    servidor.Options(R"(.*)", [](const httplib::Request&, httplib::Response& res) {
        res.status = 204;
    });
}

void registrar_saude(httplib::Server& servidor) {
    servidor.Get("/saude", [](const httplib::Request&, httplib::Response& res) {
        responder(res, 200, json{{"status", "ok"}, {"servico", "auth"}});
    });
}

void registrar_conta(httplib::Server& servidor, Contas& contas) {
    servidor.Post("/conta/cadastro", [&contas](const httplib::Request& req, httplib::Response& res) {
        auto corpo = corpo_json(req, res);
        if (!corpo) return;
        tratar(res, [&] {
            auto usuario = contas.cadastrar(campo(*corpo, "nome"), campo(*corpo, "email"),
                                            campo(*corpo, "senha"));
            responder(res, 201, json{{"usuario", usuario_json(usuario)}});
        });
    });

    servidor.Post("/conta/login", [&contas](const httplib::Request& req, httplib::Response& res) {
        auto corpo = corpo_json(req, res);
        if (!corpo) return;
        tratar(res, [&] {
            auto sessao = contas.entrar(campo(*corpo, "email"), campo(*corpo, "senha"));
            responder(res, 200, json{{"token", sessao.token},
                                     {"expira_em", sessao.expira_em},
                                     {"usuario", usuario_json(sessao.usuario)}});
        });
    });

    servidor.Get("/conta/eu", [&contas](const httplib::Request& req, httplib::Response& res) {
        tratar(res, [&] {
            auto usuario = contas.usuario_da_sessao(token_do_cabecalho(req));
            if (!usuario) {
                responder_erro(res, 401, "Sessão expirada. Entre de novo.");
                return;
            }
            responder(res, 200, json{{"usuario", usuario_json(*usuario)}});
        });
    });

    servidor.Post("/conta/sair", [&contas](const httplib::Request& req, httplib::Response& res) {
        tratar(res, [&] {
            contas.sair(token_do_cabecalho(req));
            res.status = 204;
        });
    });
}

void registrar_recuperacao(httplib::Server& servidor, Recuperacao& recuperacao, bool modo_demo) {
    servidor.Post("/conta/recuperar-senha", [&recuperacao, modo_demo](const httplib::Request& req,
                                                                      httplib::Response& res) {
        auto corpo = corpo_json(req, res);
        if (!corpo) return;
        tratar(res, [&] {
            auto codigo = recuperacao.solicitar(campo(*corpo, "email"));
            json resposta{{"mensagem",
                           "Se houver uma conta com esse e-mail, enviamos um código de 6 dígitos. "
                           "Ele vale por 15 minutos."}};
            // Sem servidor de e-mail no ambiente da entrega, o codigo volta na
            // resposta para a banca conseguir testar o fluxo inteiro.
            if (modo_demo && codigo) {
                resposta["codigo_demo"] = *codigo;
            }
            responder(res, 202, resposta);
        });
    });

    servidor.Post("/conta/redefinir-senha", [&recuperacao](const httplib::Request& req,
                                                           httplib::Response& res) {
        auto corpo = corpo_json(req, res);
        if (!corpo) return;
        tratar(res, [&] {
            recuperacao.redefinir(campo(*corpo, "email"), campo(*corpo, "codigo"),
                                  campo(*corpo, "nova_senha"));
            responder(res, 200, json{{"mensagem", "Senha alterada. Entre com a senha nova."}});
        });
    });
}

}  // namespace rotas
