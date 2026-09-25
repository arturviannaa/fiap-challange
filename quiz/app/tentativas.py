"""Regras de uma passagem pelo quiz, as mesmas da Anamnea.

- O feedback vem na hora, questão a questão.
- A primeira resposta a cada questão é a que vale: depois de ver a explicação,
  não dá para trocar a escolha.
- "Não sei" é uma resposta (escolha nula) e conta como erro.
- Só conclui quem respondeu todas.

A pontuação:
- 10 XP por acerto, mais 20 se acertar todas;
- só a primeira conclusão de cada quiz no dia rende XP. Refazer o mesmo quiz
  para decorar o gabarito não sobe o ranking.
"""

from __future__ import annotations

from dataclasses import dataclass

from .catalogo import Quiz

XP_POR_ACERTO = 10
BONUS_POR_GABARITAR = 20


class ErroDeRegra(Exception):
    def __init__(self, status: int, mensagem: str):
        super().__init__(mensagem)
        self.status = status
        self.mensagem = mensagem


@dataclass
class Correcao:
    acertou: bool
    correta: int
    explicacao: str


def corrigir(quiz: Quiz, posicao: int, escolha: int | None, ja_respondidas: set[int]) -> Correcao:
    if not isinstance(posicao, int) or isinstance(posicao, bool) or not 0 <= posicao < len(quiz.questoes):
        raise ErroDeRegra(422, "Essa questão não existe neste quiz.")
    if posicao in ja_respondidas:
        raise ErroDeRegra(409, "Essa questão já foi respondida. A primeira resposta é a que vale.")
    questao = quiz.questoes[posicao]
    if escolha is not None and (
        not isinstance(escolha, int) or isinstance(escolha, bool) or not 0 <= escolha < len(questao.alternativas)
    ):
        raise ErroDeRegra(422, "Escolha uma das alternativas.")
    return Correcao(questao.acertou(escolha), questao.correta, questao.explicacao)


def exigir_completa(respondidas: int, total: int) -> None:
    if respondidas < total:
        faltam = total - respondidas
        raise ErroDeRegra(409, f"Faltam {faltam} {'questão' if faltam == 1 else 'questões'} para concluir.")


def xp_da_conclusao(acertos: int, total: int, primeira_do_dia: bool) -> int:
    if not primeira_do_dia:
        return 0
    return acertos * XP_POR_ACERTO + (BONUS_POR_GABARITAR if acertos == total else 0)
