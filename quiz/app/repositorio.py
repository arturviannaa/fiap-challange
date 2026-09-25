"""Persistência das tentativas em SQLite (biblioteca padrão)."""

from __future__ import annotations

import sqlite3
import threading
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Horário de Brasília. O Brasil não tem horário de verão desde 2019, então um
# deslocamento fixo resolve sem depender do tzdata do sistema.
BRASILIA = timezone(timedelta(hours=-3))

ESQUEMA = """
create table if not exists tentativas (
    id           text primary key,
    usuario_id   text not null,
    usuario_nome text not null,
    quiz_id      integer not null,
    total        integer not null,
    acertos      integer not null default 0,
    xp           integer not null default 0,
    aberta_em    text not null,
    concluida_em text
);
create index if not exists idx_tentativas_usuario on tentativas (usuario_id, quiz_id);

create table if not exists respostas (
    tentativa_id text not null references tentativas (id) on delete cascade,
    posicao      integer not null,
    escolha      integer,
    acertou      integer not null,
    respondida_em text not null,
    primary key (tentativa_id, posicao)
);
"""


def agora() -> datetime:
    return datetime.now(BRASILIA)


def inicio_do_dia(momento: datetime) -> datetime:
    return momento.astimezone(BRASILIA).replace(hour=0, minute=0, second=0, microsecond=0)


class Repositorio:
    def __init__(self, caminho: str | Path):
        if str(caminho) != ":memory:":
            Path(caminho).parent.mkdir(parents=True, exist_ok=True)
        self._conexao = sqlite3.connect(str(caminho), check_same_thread=False)
        self._conexao.row_factory = sqlite3.Row
        self._trava = threading.Lock()
        with self._trava:
            self._conexao.executescript("pragma journal_mode = wal; pragma foreign_keys = on;")
            self._conexao.executescript(ESQUEMA)

    def _executar(self, sql: str, parametros: tuple = ()) -> list[sqlite3.Row]:
        with self._trava, self._conexao:
            return self._conexao.execute(sql, parametros).fetchall()

    def abrir(self, usuario_id: str, usuario_nome: str, quiz_id: int, total: int, momento: datetime) -> str:
        tentativa_id = uuid.uuid4().hex
        self._executar(
            "insert into tentativas (id, usuario_id, usuario_nome, quiz_id, total, aberta_em) values (?, ?, ?, ?, ?, ?)",
            (tentativa_id, usuario_id, usuario_nome, quiz_id, total, momento.isoformat()),
        )
        return tentativa_id

    def obter(self, tentativa_id: str) -> dict | None:
        linhas = self._executar("select * from tentativas where id = ?", (tentativa_id,))
        return dict(linhas[0]) if linhas else None

    def respostas(self, tentativa_id: str) -> dict[int, bool]:
        linhas = self._executar(
            "select posicao, acertou from respostas where tentativa_id = ? order by posicao", (tentativa_id,)
        )
        return {linha["posicao"]: bool(linha["acertou"]) for linha in linhas}

    def registrar_resposta(
        self, tentativa_id: str, posicao: int, escolha: int | None, acertou: bool, momento: datetime
    ) -> bool:
        """Grava a resposta. Devolve False se a questão já tinha resposta (a primeira vale)."""
        try:
            with self._trava, self._conexao:
                self._conexao.execute(
                    "insert into respostas (tentativa_id, posicao, escolha, acertou, respondida_em) values (?, ?, ?, ?, ?)",
                    (tentativa_id, posicao, escolha, int(acertou), momento.isoformat()),
                )
                if acertou:
                    self._conexao.execute("update tentativas set acertos = acertos + 1 where id = ?", (tentativa_id,))
            return True
        except sqlite3.IntegrityError:
            return False

    def concluiu_hoje(self, usuario_id: str, quiz_id: int, momento: datetime) -> bool:
        linhas = self._executar(
            "select 1 from tentativas where usuario_id = ? and quiz_id = ? and concluida_em >= ? limit 1",
            (usuario_id, quiz_id, inicio_do_dia(momento).isoformat()),
        )
        return bool(linhas)

    def concluir(self, tentativa_id: str, xp: int, momento: datetime) -> None:
        self._executar(
            "update tentativas set concluida_em = ?, xp = ? where id = ? and concluida_em is null",
            (momento.isoformat(), xp, tentativa_id),
        )

    def resumo_do_usuario(self, usuario_id: str) -> dict:
        totais = self._executar(
            """select coalesce(sum(xp), 0) as xp, count(*) as concluidas,
                      coalesce(sum(acertos), 0) as acertos, coalesce(sum(total), 0) as respondidas,
                      count(distinct quiz_id) as quizzes_distintos
               from tentativas where usuario_id = ? and concluida_em is not null""",
            (usuario_id,),
        )[0]
        historico = self._executar(
            """select id, quiz_id, acertos, total, xp, concluida_em from tentativas
               where usuario_id = ? and concluida_em is not null
               order by concluida_em desc limit 20""",
            (usuario_id,),
        )
        melhores = self._executar(
            """select quiz_id, max(acertos * 1.0 / total) as melhor from tentativas
               where usuario_id = ? and concluida_em is not null group by quiz_id""",
            (usuario_id,),
        )
        return {
            "totais": dict(totais),
            "historico": [dict(linha) for linha in historico],
            "melhores": {linha["quiz_id"]: linha["melhor"] for linha in melhores},
        }

    def ranking(self, limite: int = 10) -> list[dict]:
        # O nome mais recente de cada pessoa: se ela trocar, o ranking acompanha.
        linhas = self._executar(
            """select usuario_id,
                      (select usuario_nome from tentativas t2 where t2.usuario_id = t.usuario_id
                       order by aberta_em desc limit 1) as nome,
                      sum(xp) as xp, count(*) as concluidas
               from tentativas t where concluida_em is not null
               group by usuario_id having sum(xp) > 0
               order by xp desc, concluidas desc limit ?""",
            (limite,),
        )
        return [dict(linha) for linha in linhas]
