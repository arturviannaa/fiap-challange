import unittest

from app.analise import por_disciplina, questoes_mais_erradas, recomendar, situacao
from app.catalogo import Catalogo


class TestAnalise(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogo = Catalogo.do_arquivo()
        cls.quiz = cls.catalogo.por_id(1)

    def test_situacao_nos_limites(self):
        self.assertEqual([situacao(n) for n in (70, 69, 50, 49)], ["dominada", "atenção", "atenção", "revisar"])

    def test_por_disciplina_soma_os_quizzes_e_comeca_pela_pior(self):
        mesma = [q.id for q in self.catalogo.todos(self.quiz.disciplina)]
        outra = next(q for q in self.catalogo.todos() if q.disciplina != self.quiz.disciplina)
        linhas = por_disciplina({mesma[0]: (3, 5), mesma[1]: (5, 5), outra.id: (1, 5)}, self.catalogo)
        self.assertEqual([l["disciplina"] for l in linhas], [outra.disciplina, self.quiz.disciplina])
        self.assertEqual(linhas[1]["acertos"], 8)
        self.assertEqual(linhas[1]["respondidas"], 10)
        self.assertEqual(linhas[1]["aproveitamento"], 80)
        self.assertEqual(linhas[0]["situacao"], "revisar")

    def test_por_disciplina_ignora_quiz_que_saiu_do_catalogo(self):
        self.assertEqual(por_disciplina({999: (1, 2), 1: (0, 0)}, self.catalogo), [])

    def test_recomenda_refazer_o_pior_abaixo_de_70(self):
        recomendacao = recomendar({1: 0.9, 2: 0.4, 3: 0.6}, self.catalogo)
        self.assertEqual(recomendacao["id"], 2)
        self.assertEqual(recomendacao["motivo"], "refazer")
        self.assertEqual(recomendacao["melhor_aproveitamento"], 40)

    def test_sem_quiz_fraco_recomenda_um_novo_de_nivel_1(self):
        recomendacao = recomendar({1: 1.0}, self.catalogo)
        self.assertEqual(recomendacao["motivo"], "novo")
        self.assertEqual(recomendacao["nivel"], 1)
        self.assertNotEqual(recomendacao["id"], 1)

    def test_tudo_feito_e_dominado_nao_recomenda_nada(self):
        self.assertIsNone(recomendar({q.id: 0.8 for q in self.catalogo.todos()}, self.catalogo))

    def test_questoes_mais_erradas_exigem_minimo_de_respostas(self):
        estatisticas = [
            {"quiz_id": 1, "posicao": 0, "respostas": 4, "acertos": 1},
            {"quiz_id": 1, "posicao": 1, "respostas": 2, "acertos": 0},
            {"quiz_id": 1, "posicao": 2, "respostas": 3, "acertos": 3},
            {"quiz_id": 1, "posicao": 99, "respostas": 9, "acertos": 0},
            {"quiz_id": 999, "posicao": 0, "respostas": 9, "acertos": 0},
        ]
        linhas = questoes_mais_erradas(estatisticas, self.catalogo)
        self.assertEqual([l["posicao"] for l in linhas], [0, 2])
        self.assertEqual(linhas[0]["taxa_de_acerto"], 25)
        self.assertEqual(linhas[0]["enunciado"], self.quiz.questoes[0].enunciado)
        self.assertNotIn("correta", linhas[0])


if __name__ == "__main__":
    unittest.main()
