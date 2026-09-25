"""Catálogo de quizzes, lido de um JSON versionado junto com o código.

As 120 questões vêm do banco de questões da Anamnea: 16 quizzes, oito
disciplinas do ciclo básico, dois níveis cada. O gabarito fica só aqui dentro;
o que sai para o navegador passa por `para_o_aluno`, que tira a alternativa
correta e a explicação.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

ARQUIVO_PADRAO = Path(__file__).resolve().parent.parent / "dados" / "quizzes.json"


@dataclass(frozen=True)
class Questao:
    posicao: int
    enunciado: str
    alternativas: tuple[str, ...]
    correta: int
    explicacao: str

    def acertou(self, escolha: int | None) -> bool:
        return escolha is not None and escolha == self.correta

    def para_o_aluno(self) -> dict:
        return {
            "posicao": self.posicao,
            "enunciado": self.enunciado,
            "alternativas": list(self.alternativas),
        }


@dataclass(frozen=True)
class Quiz:
    id: int
    titulo: str
    nivel: int
    disciplina: str
    descricao: str
    questoes: tuple[Questao, ...]

    def resumo(self) -> dict:
        return {
            "id": self.id,
            "titulo": self.titulo,
            "nivel": self.nivel,
            "disciplina": self.disciplina,
            "descricao": self.descricao,
            "total_questoes": len(self.questoes),
        }

    def para_o_aluno(self) -> dict:
        return {**self.resumo(), "questoes": [q.para_o_aluno() for q in self.questoes]}


class Catalogo:
    def __init__(self, quizzes: list[Quiz]):
        self._por_id = {quiz.id: quiz for quiz in quizzes}

    @classmethod
    def do_arquivo(cls, caminho: Path = ARQUIVO_PADRAO) -> "Catalogo":
        with open(caminho, encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
        return cls([_quiz_de(bruto) for bruto in dados["quizzes"]])

    def todos(self, disciplina: str | None = None) -> list[Quiz]:
        quizzes = sorted(self._por_id.values(), key=lambda q: (q.disciplina, q.nivel, q.id))
        if disciplina:
            quizzes = [q for q in quizzes if q.disciplina.casefold() == disciplina.casefold()]
        return quizzes

    def por_id(self, quiz_id: int) -> Quiz | None:
        return self._por_id.get(quiz_id)

    def disciplinas(self) -> list[str]:
        return sorted({q.disciplina for q in self._por_id.values()})


def _quiz_de(bruto: dict) -> Quiz:
    questoes = []
    for posicao, q in enumerate(bruto["questoes"]):
        alternativas = tuple(q["alternativas"])
        if not 0 <= q["correta"] < len(alternativas):
            raise ValueError(f"Quiz {bruto['id']}, questão {posicao}: gabarito fora das alternativas")
        questoes.append(Questao(posicao, q["enunciado"], alternativas, q["correta"], q["explicacao"]))
    if not questoes:
        raise ValueError(f"Quiz {bruto['id']} sem questões")
    return Quiz(
        id=int(bruto["id"]),
        titulo=bruto["titulo"],
        nivel=int(bruto["nivel"]),
        disciplina=bruto["disciplina"],
        descricao=bruto["descricao"],
        questoes=tuple(questoes),
    )
