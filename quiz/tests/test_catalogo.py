import unittest

from app.catalogo import Catalogo


class TestCatalogo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogo = Catalogo.do_arquivo()

    def test_banco_tem_16_quizzes_e_120_questoes(self):
        quizzes = self.catalogo.todos()
        self.assertEqual(len(quizzes), 16)
        self.assertEqual(sum(len(q.questoes) for q in quizzes), 120)

    def test_oito_disciplinas_com_dois_quizzes_cada(self):
        disciplinas = self.catalogo.disciplinas()
        self.assertEqual(len(disciplinas), 8)
        for disciplina in disciplinas:
            self.assertEqual(len(self.catalogo.todos(disciplina)), 2, disciplina)

    def test_filtro_de_disciplina_ignora_maiusculas(self):
        self.assertEqual(len(self.catalogo.todos("SEMIOLOGIA")), 2)

    def test_todo_gabarito_aponta_para_uma_alternativa(self):
        for quiz in self.catalogo.todos():
            for questao in quiz.questoes:
                self.assertTrue(0 <= questao.correta < len(questao.alternativas))
                self.assertTrue(questao.explicacao.strip())

    def test_o_que_vai_para_o_aluno_nao_tem_gabarito(self):
        publico = self.catalogo.por_id(1).para_o_aluno()
        for questao in publico["questoes"]:
            self.assertNotIn("correta", questao)
            self.assertNotIn("explicacao", questao)

    def test_quiz_inexistente(self):
        self.assertIsNone(self.catalogo.por_id(999))


if __name__ == "__main__":
    unittest.main()
