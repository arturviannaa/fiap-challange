"""Testes de ponta a ponta da API: servidor real numa porta livre, auth falso."""

import json
import threading
import unittest
import urllib.error
import urllib.parse
import urllib.request

from app.autenticacao import Aluno
from app.catalogo import Catalogo
from app.repositorio import Repositorio
from app.servidor import Aplicacao, criar_servidor

ORIGEM = "http://localhost:8080"


class AuthFalso:
    """Faz o papel do serviço C++: cada token conhecido é um aluno."""

    def __init__(self):
        self.alunos = {
            "token-artur": Aluno("u1", "Artur", "artur@exemplo.com"),
            "token-pedro": Aluno("u2", "Pedro", "pedro@exemplo.com"),
        }

    def aluno_do_token(self, token):
        return self.alunos.get(token)


class TestServidor(unittest.TestCase):
    def setUp(self):
        self.catalogo = Catalogo.do_arquivo()
        app = Aplicacao(self.catalogo, Repositorio(":memory:"), AuthFalso())
        self.servidor = criar_servidor(app, 0, [ORIGEM], host="127.0.0.1")
        self.base = f"http://127.0.0.1:{self.servidor.server_address[1]}"
        threading.Thread(target=self.servidor.serve_forever, daemon=True).start()

    def tearDown(self):
        self.servidor.shutdown()
        self.servidor.server_close()

    def pedir(self, metodo, caminho, corpo=None, token=None, cabecalhos=None):
        dados = json.dumps(corpo).encode() if corpo is not None else None
        pedido = urllib.request.Request(self.base + caminho, data=dados, method=metodo)
        pedido.add_header("Content-Type", "application/json")
        if token:
            pedido.add_header("Authorization", f"Bearer {token}")
        for nome, valor in (cabecalhos or {}).items():
            pedido.add_header(nome, valor)
        try:
            with urllib.request.urlopen(pedido) as resposta:
                bruto = resposta.read()
                return resposta.status, json.loads(bruto) if bruto else None, resposta.headers
        except urllib.error.HTTPError as erro:
            return erro.code, json.loads(erro.read()), erro.headers

    def fazer_quiz(self, token, quiz_id, acertar):
        status, aberta, _ = self.pedir("POST", f"/quizzes/{quiz_id}/tentativas", token=token)
        self.assertEqual(status, 201)
        quiz = self.catalogo.por_id(quiz_id)
        for questao in quiz.questoes:
            escolha = questao.correta if acertar(questao.posicao) else (questao.correta + 1) % 4
            status, _, _ = self.pedir(
                "POST", f"/tentativas/{aberta['tentativa_id']}/respostas", {"posicao": questao.posicao, "escolha": escolha}, token
            )
            self.assertEqual(status, 200)
        return self.pedir("POST", f"/tentativas/{aberta['tentativa_id']}/concluir", token=token)

    def test_listagem_publica(self):
        status, corpo, _ = self.pedir("GET", "/quizzes")
        self.assertEqual(status, 200)
        self.assertEqual(len(corpo["quizzes"]), 16)
        self.assertEqual(len(corpo["disciplinas"]), 8)
        status, corpo, _ = self.pedir("GET", "/quizzes?disciplina=" + urllib.parse.quote("Genética"))
        self.assertEqual({q["disciplina"] for q in corpo["quizzes"]}, {"Genética"})

    def test_detalhe_nao_vaza_gabarito(self):
        status, corpo, _ = self.pedir("GET", "/quizzes/3")
        self.assertEqual(status, 200)
        self.assertNotIn("correta", json.dumps(corpo))
        self.assertEqual(self.pedir("GET", "/quizzes/999")[0], 404)
        self.assertEqual(self.pedir("GET", "/quizzes/abc")[0], 404)

    def test_tentativa_exige_login(self):
        self.assertEqual(self.pedir("POST", "/quizzes/1/tentativas")[0], 401)
        self.assertEqual(self.pedir("POST", "/quizzes/1/tentativas", token="invalido")[0], 401)

    def test_quiz_completo_rende_xp_uma_vez_por_dia(self):
        status, resultado, _ = self.fazer_quiz("token-artur", 1, acertar=lambda p: True)
        self.assertEqual(status, 200)
        total = len(self.catalogo.por_id(1).questoes)
        self.assertEqual(resultado["acertos"], total)
        self.assertEqual(resultado["xp_ganho"], total * 10 + 20)

        _, repetido, _ = self.fazer_quiz("token-artur", 1, acertar=lambda p: True)
        self.assertEqual(repetido["xp_ganho"], 0)
        self.assertFalse(repetido["primeira_do_dia"])

    def test_resposta_repetida_e_conclusao_antecipada_sao_recusadas(self):
        _, aberta, _ = self.pedir("POST", "/quizzes/2/tentativas", token="token-pedro")
        caminho = f"/tentativas/{aberta['tentativa_id']}"
        status, correcao, _ = self.pedir("POST", caminho + "/respostas", {"posicao": 0, "escolha": None}, "token-pedro")
        self.assertEqual(status, 200)
        self.assertFalse(correcao["acertou"])
        self.assertIn("explicacao", correcao)
        self.assertEqual(self.pedir("POST", caminho + "/respostas", {"posicao": 0, "escolha": 1}, "token-pedro")[0], 409)
        status, corpo, _ = self.pedir("POST", caminho + "/concluir", token="token-pedro")
        self.assertEqual(status, 409)
        self.assertIn("Faltam", corpo["erro"])

    def test_tentativa_de_outro_aluno_nao_aparece(self):
        _, aberta, _ = self.pedir("POST", "/quizzes/2/tentativas", token="token-pedro")
        status, _, _ = self.pedir(
            "POST", f"/tentativas/{aberta['tentativa_id']}/respostas", {"posicao": 0, "escolha": 0}, "token-artur"
        )
        self.assertEqual(status, 404)

    def test_resumo_e_ranking(self):
        self.fazer_quiz("token-artur", 1, acertar=lambda p: True)
        self.fazer_quiz("token-pedro", 1, acertar=lambda p: p % 2 == 0)
        status, resumo, _ = self.pedir("GET", "/eu/resumo", token="token-pedro")
        self.assertEqual(status, 200)
        self.assertEqual(resumo["tentativas_concluidas"], 1)
        self.assertEqual(len(resumo["historico"]), 1)
        self.assertEqual(resumo["aproveitamento"], 50)

        _, ranking, _ = self.pedir("GET", "/ranking")
        self.assertEqual([linha["nome"] for linha in ranking["ranking"]], ["Artur", "Pedro"])
        self.assertNotIn("usuario_id", json.dumps(ranking))
        _, ranking, _ = self.pedir("GET", "/ranking", token="token-pedro")
        self.assertEqual([linha["voce"] for linha in ranking["ranking"]], [False, True])

        _, lista, _ = self.pedir("GET", "/quizzes", token="token-artur")
        primeiro = next(q for q in lista["quizzes"] if q["id"] == 1)
        self.assertEqual(primeiro["melhor_aproveitamento"], 100)

    def test_cors_so_para_a_origem_permitida(self):
        _, _, cabecalhos = self.pedir("GET", "/saude", cabecalhos={"Origin": ORIGEM})
        self.assertEqual(cabecalhos["Access-Control-Allow-Origin"], ORIGEM)
        _, _, cabecalhos = self.pedir("GET", "/saude", cabecalhos={"Origin": "http://outro.site"})
        self.assertIsNone(cabecalhos["Access-Control-Allow-Origin"])

    def test_corpo_invalido(self):
        pedido = urllib.request.Request(
            self.base + "/quizzes/1/tentativas", data=b"nao e json", method="POST",
            headers={"Authorization": "Bearer token-artur", "Content-Type": "application/json"},
        )
        with self.assertRaises(urllib.error.HTTPError) as contexto:
            urllib.request.urlopen(pedido)
        self.assertEqual(contexto.exception.code, 400)


if __name__ == "__main__":
    unittest.main()
