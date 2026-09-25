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

async function carregar() {
  try {
    const [resumo, ranking] = await Promise.all([
      quiz("/eu/resumo", { autenticado: true }),
      quiz("/ranking", { autenticado: true }),
    ]);
    desenharNumeros(resumo);
    desenharHistorico(resumo.historico);
    desenharRanking(ranking.ranking);
  } catch (erro) {
    mostrarAviso($("aviso"), erro.message);
  }
}

if (usuario) carregar();
