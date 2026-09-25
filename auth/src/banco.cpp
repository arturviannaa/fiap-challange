#include "banco.hpp"

#include <sqlite3.h>

#include <stdexcept>

namespace {

class Comando {
public:
    Comando(sqlite3* conexao, const std::string& sql) : conexao_(conexao) {
        if (sqlite3_prepare_v2(conexao, sql.c_str(), -1, &stmt_, nullptr) != SQLITE_OK) {
            throw std::runtime_error(std::string("SQL invalido: ") + sqlite3_errmsg(conexao));
        }
    }
    ~Comando() { sqlite3_finalize(stmt_); }
    Comando(const Comando&) = delete;
    Comando& operator=(const Comando&) = delete;

    void vincular(const std::vector<Banco::Valor>& parametros) {
        for (size_t i = 0; i < parametros.size(); ++i) {
            int indice = static_cast<int>(i + 1);
            const auto& valor = parametros[i];
            if (std::holds_alternative<std::nullptr_t>(valor)) {
                sqlite3_bind_null(stmt_, indice);
            } else if (std::holds_alternative<long long>(valor)) {
                sqlite3_bind_int64(stmt_, indice, std::get<long long>(valor));
            } else {
                const auto& texto = std::get<std::string>(valor);
                sqlite3_bind_text(stmt_, indice, texto.c_str(), static_cast<int>(texto.size()),
                                  SQLITE_TRANSIENT);
            }
        }
    }

    bool proxima() {
        int codigo = sqlite3_step(stmt_);
        if (codigo == SQLITE_ROW) {
            return true;
        }
        if (codigo == SQLITE_DONE) {
            return false;
        }
        throw std::runtime_error(std::string("Falha no banco: ") + sqlite3_errmsg(conexao_));
    }

    Banco::Linha linha() const {
        Banco::Linha saida;
        int colunas = sqlite3_column_count(stmt_);
        for (int i = 0; i < colunas; ++i) {
            std::string nome = sqlite3_column_name(stmt_, i);
            switch (sqlite3_column_type(stmt_, i)) {
                case SQLITE_NULL:
                    saida[nome] = nullptr;
                    break;
                case SQLITE_INTEGER:
                    saida[nome] = static_cast<long long>(sqlite3_column_int64(stmt_, i));
                    break;
                default:
                    saida[nome] = std::string(
                        reinterpret_cast<const char*>(sqlite3_column_text(stmt_, i)),
                        static_cast<size_t>(sqlite3_column_bytes(stmt_, i)));
            }
        }
        return saida;
    }

private:
    sqlite3* conexao_;
    sqlite3_stmt* stmt_ = nullptr;
};

}  // namespace

Banco::Banco(const std::string& caminho) {
    if (sqlite3_open(caminho.c_str(), &conexao_) != SQLITE_OK) {
        std::string erro = sqlite3_errmsg(conexao_);
        sqlite3_close(conexao_);
        throw std::runtime_error("Nao foi possivel abrir o banco " + caminho + ": " + erro);
    }
    executar_script("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
}

Banco::~Banco() { sqlite3_close(conexao_); }

void Banco::executar_script(const std::string& sql) {
    auto trava = travar();
    char* erro = nullptr;
    if (sqlite3_exec(conexao_, sql.c_str(), nullptr, nullptr, &erro) != SQLITE_OK) {
        std::string mensagem = erro ? erro : "erro desconhecido";
        sqlite3_free(erro);
        throw std::runtime_error("Falha no script SQL: " + mensagem);
    }
}

long long Banco::executar(const std::string& sql, const std::vector<Valor>& parametros) {
    auto trava = travar();
    Comando comando(conexao_, sql);
    comando.vincular(parametros);
    while (comando.proxima()) {
    }
    return sqlite3_changes(conexao_);
}

std::vector<Banco::Linha> Banco::consultar(const std::string& sql,
                                           const std::vector<Valor>& parametros) {
    auto trava = travar();
    Comando comando(conexao_, sql);
    comando.vincular(parametros);
    std::vector<Linha> linhas;
    while (comando.proxima()) {
        linhas.push_back(comando.linha());
    }
    return linhas;
}

std::unique_lock<std::recursive_mutex> Banco::travar() {
    return std::unique_lock<std::recursive_mutex>(mutex_);
}

std::string Banco::texto(const Linha& linha, const std::string& coluna) {
    auto it = linha.find(coluna);
    if (it == linha.end() || !std::holds_alternative<std::string>(it->second)) {
        return "";
    }
    return std::get<std::string>(it->second);
}

long long Banco::inteiro(const Linha& linha, const std::string& coluna) {
    auto it = linha.find(coluna);
    if (it == linha.end() || !std::holds_alternative<long long>(it->second)) {
        return 0;
    }
    return std::get<long long>(it->second);
}
