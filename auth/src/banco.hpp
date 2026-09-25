#pragma once

#include <map>
#include <mutex>
#include <string>
#include <variant>
#include <vector>

struct sqlite3;

// Uma conexao SQLite compartilhada pelas threads do servidor HTTP. O mutex
// serializa o acesso; para o volume de uma turma, e mais que suficiente.
class Banco {
public:
    using Valor = std::variant<std::nullptr_t, long long, std::string>;
    using Linha = std::map<std::string, Valor>;

    explicit Banco(const std::string& caminho);
    ~Banco();
    Banco(const Banco&) = delete;
    Banco& operator=(const Banco&) = delete;

    void executar_script(const std::string& sql);

    // Devolve quantas linhas o comando alterou.
    long long executar(const std::string& sql, const std::vector<Valor>& parametros = {});

    std::vector<Linha> consultar(const std::string& sql,
                                 const std::vector<Valor>& parametros = {});

    // Para operacoes de varios passos que precisam ser atomicas.
    std::unique_lock<std::recursive_mutex> travar();

    static std::string texto(const Linha& linha, const std::string& coluna);
    static long long inteiro(const Linha& linha, const std::string& coluna);

private:
    sqlite3* conexao_ = nullptr;
    std::recursive_mutex mutex_;
};
