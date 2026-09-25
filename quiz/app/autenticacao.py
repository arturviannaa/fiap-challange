"""Quem é o aluno? Pergunta ao serviço de autenticação em C++.

O serviço de quizzes não guarda senha nem sessão: recebe o token Bearer que o
navegador mandou e confirma com `GET /conta/eu` no serviço de auth. A resposta
fica em cache por um minuto para não consultar a cada questão respondida.
"""

from __future__ import annotations

import json
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass


@dataclass(frozen=True)
class Aluno:
    id: str
    nome: str
    email: str


class ServicoDeAuthIndisponivel(Exception):
    pass


class ClienteDeAuth:
    VALIDADE_DO_CACHE = 60.0

    def __init__(self, url_base: str, tempo_limite: float = 3.0):
        self._url = url_base.rstrip("/")
        self._tempo_limite = tempo_limite
        self._cache: dict[str, tuple[float, Aluno]] = {}
        self._trava = threading.Lock()

    def aluno_do_token(self, token: str) -> Aluno | None:
        if not token:
            return None
        with self._trava:
            guardado = self._cache.get(token)
            if guardado and guardado[0] > time.monotonic():
                return guardado[1]

        pedido = urllib.request.Request(f"{self._url}/conta/eu", headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(pedido, timeout=self._tempo_limite) as resposta:
                usuario = json.load(resposta)["usuario"]
        except urllib.error.HTTPError as erro:
            if erro.code == 401:
                return None
            raise ServicoDeAuthIndisponivel(f"auth respondeu {erro.code}") from erro
        except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as erro:
            raise ServicoDeAuthIndisponivel(str(erro)) from erro

        aluno = Aluno(usuario["id"], usuario["nome"], usuario["email"])
        with self._trava:
            self._cache[token] = (time.monotonic() + self.VALIDADE_DO_CACHE, aluno)
            if len(self._cache) > 5000:
                self._cache.clear()
        return aluno

    def esquecer(self, token: str) -> None:
        with self._trava:
            self._cache.pop(token, None)
