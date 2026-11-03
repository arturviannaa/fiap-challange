import { quiz } from "../api.js";
import { iniciarCasca } from "../casca.js";
import { el, plural } from "../dom.js";
import { mostrarAviso } from "../formulario.js";

const usuario = iniciarCasca();
const $ = (id) => document.getElementById(id);

const QUANDO = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function vazio(texto, acao) {
  return el(
    "div",
    { class: "estado-vazio" },
    el("img", { src: "img/vento/lendo.webp", alt: "", width: "512", height: "818" }),
    el("p", {}, texto),
    acao,
  );
}

function desenharNumeros(resumo) {
  $("xp-total").textContent = String(resumo.xp_total);
  $("quizzes-feitos").textContent = `${resumo.quizzes_distintos}/${resumo.quizzes_no_catalogo}`;
  $("aproveitamento").textContent = resumo.aproveitamento === null ? "–" : `${resumo.aproveitamento}%`;
  $("respondidas").textContent = String(resumo.respondidas);

  const trilho = $("trilho-cobertura");
  trilho.max = resumo.quizzes_no_catalogo;
  trilho.value = resumo.quizzes_distintos;
  trilho.dataset.cor = resumo.quizzes_distintos === resumo.quizzes_no_catalogo ? "ok" : "";
  $("rotulo-cobertura").textContent = `${resumo.quizzes_distintos} de ${plural(resumo.quizzes_no_catalogo, "quiz", "quizzes")}`;
}

function desenharHistorico(historico) {
  const alvo = $("historico");
  alvo.setAttribute("aria-busy", "false");
  if (!historico.length) {
    alvo.replaceChildren(
      vazio("Você ainda não concluiu nenhum quiz.", el("a", { class: "btn btn-acao", href: "quizzes.html" }, "Fazer o primeiro")),
    );
    return;
  }
  const linhas = historico.map((item) =>
    el(
      "tr",
      {},
      el(
        "td",
        {},
        el("a", { href: `quiz.html?id=${item.quiz_id}` }, item.titulo),
        el("small", {}, `${item.disciplina} · `, el("time", { datetime: item.concluida_em }, QUANDO.format(new Date(item.concluida_em)))),
      ),
      el("td", { class: "numero" }, `${item.acertos}/${item.total}`),
      el("td", { class: "numero" }, item.xp ? `+${item.xp}` : "0"),
    ),
  );
  alvo.replaceChildren(
    el(
      "table",
      { class: "tabela" },
      el("caption", { class: "sr-only" }, "Últimos quizzes concluídos, do mais recente ao mais antigo"),
      el(
        "thead",
        {},
        el("tr", {}, el("th", { scope: "col" }, "Quiz"), el("th", { scope: "col", class: "numero" }, "Acertos"), el("th", { scope: "col", class: "numero" }, "XP")),
      ),
      el("tbody", {}, linhas),
    ),
  );
}

function desenharRanking(ranking) {
  const alvo = $("ranking");
  alvo.setAttribute("aria-busy", "false");
  if (!ranking.length) {
    alvo.replaceChildren(vazio("Ninguém somou XP ainda. O primeiro quiz concluído abre o ranking."));
    return;
  }
  alvo.replaceChildren(
    el(
      "ol",
      { class: "ranking" },
      ranking.map((linha) =>
        el(
          "li",
          { "data-voce": linha.voce || null, "aria-current": linha.voce ? "true" : null },
          el("span", { class: "posicao", "aria-hidden": "true" }, String(linha.posicao)),
          el("span", { class: "nome" }, linha.nome, linha.voce ? el("span", { class: "sr-only" }, " (você)") : null),
          el("span", { class: "xp" }, `${linha.xp} XP`),
        ),
      ),
    ),
  );
}

function tabela(legenda, colunas, linhas) {
  return el(
    "table",
    { class: "tabela" },
    el("caption", { class: "sr-only" }, legenda),
    el("thead", {}, el("tr", {}, colunas.map(([nome, numero]) => el("th", { scope: "col", class: numero ? "numero" : null }, nome)))),
    el("tbody", {}, linhas),
  );
}

function desenharDisciplinas({ disciplinas, recomendacao }) {
  const alvo = $("disciplinas");
  alvo.setAttribute("aria-busy", "false");
  const proximo = recomendacao
    ? el(
        "a",
        { class: "btn btn-acao", href: `quiz.html?id=${recomendacao.id}` },
        recomendacao.motivo === "refazer" ? `Refazer ${recomendacao.titulo} (${recomendacao.melhor_aproveitamento}%)` : `Próximo: ${recomendacao.titulo}`,
      )
    : null;
  if (!disciplinas.length) {
    alvo.replaceChildren(vazio("Responda um quiz para ver seu aproveitamento por disciplina.", proximo));
    return;
  }
  alvo.replaceChildren(
    tabela(
      "Aproveitamento por disciplina, da mais fraca para a mais forte",
      [["Disciplina"], ["Acerto", true], ["Situação", true]],
      disciplinas.map((d) =>
        el("tr", {}, el("td", {}, d.disciplina), el("td", { class: "numero" }, `${d.aproveitamento}%`), el("td", { class: "numero" }, d.situacao)),
      ),
    ),
    proximo,
  );
}

function desenharTurma({ questoes, minimo_de_respostas }) {
  const alvo = $("turma");
  alvo.setAttribute("aria-busy", "false");
  if (!questoes.length) {
    alvo.replaceChildren(vazio(`Aparece quando uma questão tiver ${minimo_de_respostas} respostas.`));
    return;
  }
  alvo.replaceChildren(
    tabela(
      "Questões com menor taxa de acerto da turma",
      [["Questão"], ["Acerto", true]],
      questoes.map((q) =>
        el(
          "tr",
          {},
          el("td", {}, q.enunciado, el("small", {}, `${q.titulo} · ${plural(q.respostas, "resposta", "respostas")}`)),
          el("td", { class: "numero" }, `${q.taxa_de_acerto}%`),
        ),
      ),
    ),
  );
}

async function carregar() {
  try {
    const [resumo, ranking, analise, turma] = await Promise.all([
      quiz("/eu/resumo", { autenticado: true }),
      quiz("/ranking", { autenticado: true }),
      quiz("/eu/analise", { autenticado: true }),
      quiz("/analise/questoes"),
    ]);
    desenharNumeros(resumo);
    desenharHistorico(resumo.historico);
    desenharRanking(ranking.ranking);
    desenharDisciplinas(analise);
    desenharTurma(turma);
  } catch (erro) {
    mostrarAviso($("aviso"), erro.message);
  }
}

if (usuario) carregar();
