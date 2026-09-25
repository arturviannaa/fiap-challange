"""Sobe o serviço: `python -m app`."""

import os

from .autenticacao import ClienteDeAuth
from .catalogo import Catalogo
from .repositorio import Repositorio
from .servidor import Aplicacao, criar_servidor


def principal() -> None:
    porta = int(os.environ.get("PORTA", "8093"))
    origens = [o for o in os.environ.get("ORIGENS", "http://localhost:8080,http://127.0.0.1:8080").split(",") if o]
    app = Aplicacao(
        catalogo=Catalogo.do_arquivo(),
        repositorio=Repositorio(os.environ.get("BANCO", "var/quiz.db")),
        auth=ClienteDeAuth(os.environ.get("AUTH_URL", "http://localhost:8092")),
    )
    servidor = criar_servidor(app, porta, origens)
    print(f"quiz ouvindo na porta {porta}: {len(app.catalogo.todos())} quizzes", flush=True)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    principal()
