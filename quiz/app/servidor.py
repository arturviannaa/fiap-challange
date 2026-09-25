"""API HTTP do serviço de quizzes, só com a biblioteca padrão do Python."""

from __future__ import annotations

import json
import re
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .autenticacao import Aluno, ClienteDeAuth, ServicoDeAuthIndisponivel
from .catalogo import Catalogo
from .repositorio import Repositorio, agora
from .tentativas import ErroDeRegra, corrigir, exigir_completa, xp_da_conclusao

TAMANHO_MAXIMO_DO_CORPO = 4 * 1024


class Resposta(Exception):
    """Interrompe o tratamento devolvendo uma resposta pronta (normalmente erro)."""

    def __init__(self, status: int, corpo: dict):
        super().__init__(corpo)
        self.status = status
        self.corpo = corpo


def erro(status: int, mensagem: str) -> Resposta:
    return Resposta(status, {"erro": mensagem})


class Aplicacao:
    """Os casos de uso, sem nada de HTTP: recebem valores e devolvem dicionários."""

    def __init__(self, catalogo: Catalogo, repositorio: Repositorio, auth: ClienteDeAuth):
        self.catalogo = catalogo
        self.repositorio = repositorio
        self.auth = auth

    def aluno(self, token: str, obrigatorio: bool = True) -> Aluno | None:
        try:
            aluno = self.auth.aluno_do_token(token)
        except ServicoDeAuthIndisponivel:
            if not obrigatorio:
                return None
            raise erro(503, "O serviço de login não respondeu. Tente de novo em instantes.")
        if aluno is None and obrigatorio:
            raise erro(401, "Sessão expirada. Entre de novo.")
        return aluno

    def _quiz(self, quiz_id: str):
        quiz = self.catalogo.por_id(int(quiz_id)) if quiz_id.isdigit() else None
        if quiz is None:
            raise erro(404, "Quiz não encontrado.")
        return quiz

    def _tentativa_aberta(self, tentativa_id: str, aluno: Aluno) -> dict:
        tentativa = self.repositorio.obter(tentativa_id)
        if tentativa is None or tentativa["usuario_id"] != aluno.id:
            raise erro(404, "Tentativa não encontrada.")
        if tentativa["concluida_em"] is not None:
            raise erro(409, "Essa tentativa já foi concluída.")
        return tentativa

    # ---------- leitura ----------

    def listar(self, disciplina: str | None, token: str) -> dict:
        # A lista e publica, mas token vencido e erro: a tela precisa saber que a sessao caiu.
        # Se o auth estiver fora do ar, a lista sai sem o aproveitamento do aluno.
        aluno = None
        if token:
            try:
                aluno = self.auth.aluno_do_token(token)
            except ServicoDeAuthIndisponivel:
                aluno = None
            else:
                if aluno is None:
                    raise erro(401, "Sessão expirada. Entre de novo.")
        melhores = self.repositorio.resumo_do_usuario(aluno.id)["melhores"] if aluno else {}
        quizzes = []
        for quiz in self.catalogo.todos(disciplina):
            item = quiz.resumo()
            melhor = melhores.get(quiz.id)
            item["melhor_aproveitamento"] = round(melhor * 100) if melhor is not None else None
            quizzes.append(item)
        return {"disciplinas": self.catalogo.disciplinas(), "quizzes": quizzes}

    def detalhar(self, quiz_id: str) -> dict:
        return self._quiz(quiz_id).para_o_aluno()

    def ranking(self, token: str) -> dict:
        # Com token, marca a linha de quem pediu; o id dos outros nunca sai daqui.
        aluno = self.aluno(token, obrigatorio=False) if token else None
        return {
            "ranking": [
                {
                    "posicao": i + 1,
                    "nome": linha["nome"],
                    "xp": linha["xp"],
                    "concluidas": linha["concluidas"],
                    "voce": aluno is not None and linha["usuario_id"] == aluno.id,
                }
                for i, linha in enumerate(self.repositorio.ranking())
            ]
        }

    def resumo(self, token: str) -> dict:
        aluno = self.aluno(token)
        dados = self.repositorio.resumo_do_usuario(aluno.id)
        totais = dados["totais"]
        historico = []
        for linha in dados["historico"]:
            quiz = self.catalogo.por_id(linha["quiz_id"])
            historico.append(
                {
                    "quiz_id": linha["quiz_id"],
                    "titulo": quiz.titulo if quiz else "Quiz removido",
                    "disciplina": quiz.disciplina if quiz else "",
                    "acertos": linha["acertos"],
                    "total": linha["total"],
                    "xp": linha["xp"],
                    "concluida_em": linha["concluida_em"],
                }
            )
        respondidas = totais["respondidas"]
        return {
            "aluno": {"nome": aluno.nome, "email": aluno.email},
            "xp_total": totais["xp"],
            "tentativas_concluidas": totais["concluidas"],
            "quizzes_distintos": totais["quizzes_distintos"],
            "quizzes_no_catalogo": len(self.catalogo.todos()),
            "acertos": totais["acertos"],
            "respondidas": respondidas,
            "aproveitamento": round(totais["acertos"] * 100 / respondidas) if respondidas else None,
            "historico": historico,
        }

    # ---------- tentativa ----------

    def abrir(self, quiz_id: str, token: str) -> dict:
        aluno = self.aluno(token)
        quiz = self._quiz(quiz_id)
        tentativa_id = self.repositorio.abrir(aluno.id, aluno.nome, quiz.id, len(quiz.questoes), agora())
        return {"tentativa_id": tentativa_id, "quiz": quiz.para_o_aluno()}

    def responder(self, tentativa_id: str, corpo: dict, token: str) -> dict:
        aluno = self.aluno(token)
        tentativa = self._tentativa_aberta(tentativa_id, aluno)
        quiz = self._quiz(str(tentativa["quiz_id"]))
        ja_respondidas = self.repositorio.respostas(tentativa_id)
        posicao, escolha = corpo.get("posicao"), corpo.get("escolha")
        try:
            correcao = corrigir(quiz, posicao, escolha, set(ja_respondidas))
        except ErroDeRegra as regra:
            raise erro(regra.status, regra.mensagem) from regra
        if not self.repositorio.registrar_resposta(tentativa_id, posicao, escolha, correcao.acertou, agora()):
            raise erro(409, "Essa questão já foi respondida. A primeira resposta é a que vale.")
        return {
            "acertou": correcao.acertou,
            "correta": correcao.correta,
            "explicacao": correcao.explicacao,
            "respondidas": len(ja_respondidas) + 1,
            "total": tentativa["total"],
        }

    def concluir(self, tentativa_id: str, token: str) -> dict:
        aluno = self.aluno(token)
        tentativa = self._tentativa_aberta(tentativa_id, aluno)
        respostas = self.repositorio.respostas(tentativa_id)
        try:
            exigir_completa(len(respostas), tentativa["total"])
        except ErroDeRegra as regra:
            raise erro(regra.status, regra.mensagem) from regra
        momento = agora()
        acertos = sum(respostas.values())
        primeira_do_dia = not self.repositorio.concluiu_hoje(aluno.id, tentativa["quiz_id"], momento)
        xp = xp_da_conclusao(acertos, tentativa["total"], primeira_do_dia)
        self.repositorio.concluir(tentativa_id, xp, momento)
        return {
            "acertos": acertos,
            "total": tentativa["total"],
            "xp_ganho": xp,
            "primeira_do_dia": primeira_do_dia,
            "xp_total": self.repositorio.resumo_do_usuario(aluno.id)["totais"]["xp"],
        }


ROTAS = [
    ("GET", re.compile(r"^/saude$"), lambda app, m, q, c, t: {"status": "ok", "servico": "quiz"}),
    ("GET", re.compile(r"^/quizzes$"), lambda app, m, q, c, t: app.listar(q.get("disciplina", [None])[0], t)),
    ("GET", re.compile(r"^/quizzes/(\w+)$"), lambda app, m, q, c, t: app.detalhar(m[1])),
    ("POST", re.compile(r"^/quizzes/(\w+)/tentativas$"), lambda app, m, q, c, t: (201, app.abrir(m[1], t))),
    ("POST", re.compile(r"^/tentativas/(\w+)/respostas$"), lambda app, m, q, c, t: app.responder(m[1], c, t)),
    ("POST", re.compile(r"^/tentativas/(\w+)/concluir$"), lambda app, m, q, c, t: app.concluir(m[1], t)),
    ("GET", re.compile(r"^/eu/resumo$"), lambda app, m, q, c, t: app.resumo(t)),
    ("GET", re.compile(r"^/ranking$"), lambda app, m, q, c, t: app.ranking(t)),
]


def criar_manipulador(app: Aplicacao, origens_permitidas: list[str]):
    class Manipulador(BaseHTTPRequestHandler):
        server_version = "anamnea-quiz"
        sys_version = ""

        def do_GET(self):
            self._tratar("GET")

        def do_POST(self):
            self._tratar("POST")

        def do_OPTIONS(self):
            self._enviar(HTTPStatus.NO_CONTENT, None)

        def _tratar(self, metodo: str) -> None:
            url = urlparse(self.path)
            try:
                for metodo_da_rota, padrao, acao in ROTAS:
                    encontrado = padrao.match(url.path)
                    if encontrado and metodo_da_rota == metodo:
                        corpo = self._corpo() if metodo == "POST" else {}
                        resultado = acao(app, encontrado, parse_qs(url.query), corpo, self._token())
                        status, dados = resultado if isinstance(resultado, tuple) else (200, resultado)
                        self._enviar(status, dados)
                        return
                raise erro(404, "Rota não encontrada.")
            except Resposta as resposta:
                self._enviar(resposta.status, resposta.corpo)
            except Exception as falha:  # noqa: BLE001 - qualquer falha vira 500 com log
                print(f"[erro] {metodo} {url.path}: {falha!r}", file=sys.stderr)
                self._enviar(500, {"erro": "Erro interno. Tente de novo em instantes."})

        def _token(self) -> str:
            cabecalho = self.headers.get("Authorization", "")
            return cabecalho[7:] if cabecalho.startswith("Bearer ") else ""

        def _corpo(self) -> dict:
            tamanho = int(self.headers.get("Content-Length") or 0)
            if tamanho > TAMANHO_MAXIMO_DO_CORPO:
                raise erro(413, "Corpo da requisição grande demais.")
            bruto = self.rfile.read(tamanho) if tamanho else b"{}"
            try:
                corpo = json.loads(bruto)
            except (ValueError, UnicodeDecodeError):
                raise erro(400, "Corpo da requisição precisa ser um JSON válido.") from None
            if not isinstance(corpo, dict):
                raise erro(400, "Corpo da requisição precisa ser um JSON válido.")
            return corpo

        def _enviar(self, status: int, dados: dict | None) -> None:
            conteudo = json.dumps(dados, ensure_ascii=False).encode() if dados is not None else b""
            self.send_response(status)
            origem = self.headers.get("Origin", "")
            if origem in origens_permitidas:
                self.send_header("Access-Control-Allow-Origin", origem)
                self.send_header("Vary", "Origin")
                self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Max-Age", "600")
            if dados is not None:
                self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(conteudo)))
            self.end_headers()
            self.wfile.write(conteudo)

        def log_message(self, formato, *args):
            # Sem query string nem corpo no log: só método, caminho e status.
            print(f"{self.command} {urlparse(self.path).path} {args[1] if len(args) > 1 else ''}", flush=True)

    return Manipulador


def criar_servidor(app: Aplicacao, porta: int, origens: list[str], host: str = "0.0.0.0") -> ThreadingHTTPServer:
    servidor = ThreadingHTTPServer((host, porta), criar_manipulador(app, origens))
    servidor.daemon_threads = True
    return servidor
