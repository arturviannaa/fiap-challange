from __future__ import annotations

from .catalogo import Catalogo

MINIMO_DE_RESPOSTAS = 3


def situacao(aproveitamento: int) -> str:
    if aproveitamento >= 70:
        return "dominada"
    return "atenção" if aproveitamento >= 50 else "revisar"


def por_disciplina(por_quiz: dict[int, tuple[int, int]], catalogo: Catalogo) -> list[dict]:
    somas: dict[str, list[int]] = {}
    for quiz_id, (acertos, respondidas) in por_quiz.items():
        quiz = catalogo.por_id(quiz_id)
        if quiz and respondidas:
            soma = somas.setdefault(quiz.disciplina, [0, 0])
            soma[0] += acertos
            soma[1] += respondidas
    linhas = []
    for disciplina, (acertos, respondidas) in somas.items():
        aproveitamento = round(acertos * 100 / respondidas)
        linhas.append({"disciplina": disciplina, "acertos": acertos, "respondidas": respondidas,
                       "aproveitamento": aproveitamento, "situacao": situacao(aproveitamento)})
    return sorted(linhas, key=lambda l: (l["aproveitamento"], l["disciplina"]))


def recomendar(melhores: dict[int, float], catalogo: Catalogo) -> dict | None:
    for melhor, quiz_id in sorted((m, q) for q, m in melhores.items() if m < 0.7):
        if quiz := catalogo.por_id(quiz_id):
            return {**quiz.resumo(), "motivo": "refazer", "melhor_aproveitamento": round(melhor * 100)}
    for quiz in sorted(catalogo.todos(), key=lambda q: (q.nivel, q.disciplina, q.id)):
        if quiz.id not in melhores:
            return {**quiz.resumo(), "motivo": "novo", "melhor_aproveitamento": None}
    return None


def questoes_mais_erradas(estatisticas: list[dict], catalogo: Catalogo, limite: int = 5) -> list[dict]:
    linhas = []
    for e in estatisticas:
        quiz = catalogo.por_id(e["quiz_id"])
        if quiz and 0 <= e["posicao"] < len(quiz.questoes) and e["respostas"] >= MINIMO_DE_RESPOSTAS:
            linhas.append({"quiz_id": quiz.id, "titulo": quiz.titulo, "disciplina": quiz.disciplina,
                           "posicao": e["posicao"], "enunciado": quiz.questoes[e["posicao"]].enunciado,
                           "respostas": e["respostas"], "taxa_de_acerto": round(e["acertos"] * 100 / e["respostas"])})
    linhas.sort(key=lambda l: (l["taxa_de_acerto"], -l["respostas"], l["quiz_id"], l["posicao"]))
    return linhas[:limite]
