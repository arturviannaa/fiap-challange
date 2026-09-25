import unittest

from app.catalogo import Catalogo
from app.tentativas import ErroDeRegra, corrigir, exigir_completa, xp_da_conclusao


class TestCorrecao(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.quiz = Catalogo.do_arquivo().por_id(1)

    def test_acerto_e_erro(self):
        questao = self.quiz.questoes[0]
        errada = (questao.correta + 1) % len(questao.alternativas)
        self.assertTrue(corrigir(self.quiz, 0, questao.correta, set()).acertou)
        correcao = corrigir(self.quiz, 0, errada, set())
        self.assertFalse(correcao.acertou)
        self.assertEqual(correcao.correta, questao.correta)
        self.assertTrue(correcao.explicacao)

    def test_nao_sei_conta_como_erro(self):
        self.assertFalse(corrigir(self.quiz, 0, None, set()).acertou)

    def test_primeira_resposta_e_a_que_vale(self):
        with self.assertRaises(ErroDeRegra) as contexto:
            corrigir(self.quiz, 0, 1, {0})
        self.assertEqual(contexto.exception.status, 409)

    def test_posicao_e_escolha_fora_do_quiz(self):
        for posicao, escolha in [(99, 0), (-1, 0), ("0", 0), (True, 0), (0, 9), (0, "1"), (0, False)]:
            with self.assertRaises(ErroDeRegra, msg=f"{posicao!r}, {escolha!r}"):
                corrigir(self.quiz, posicao, escolha, set())

    def test_so_conclui_quem_respondeu_todas(self):
        with self.assertRaisesRegex(ErroDeRegra, "Faltam 1 questão"):
            exigir_completa(7, 8)
        exigir_completa(8, 8)


class TestXp(unittest.TestCase):
    def test_dez_por_acerto(self):
        self.assertEqual(xp_da_conclusao(5, 8, primeira_do_dia=True), 50)

    def test_bonus_por_gabaritar(self):
        self.assertEqual(xp_da_conclusao(8, 8, primeira_do_dia=True), 100)

    def test_repetir_no_mesmo_dia_nao_rende(self):
        self.assertEqual(xp_da_conclusao(8, 8, primeira_do_dia=False), 0)


if __name__ == "__main__":
    unittest.main()
