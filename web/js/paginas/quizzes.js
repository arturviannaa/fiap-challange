import { quiz } from "../api.js";
import { iniciarCasca } from "../casca.js";
import { el, plural } from "../dom.js";
import { mostrarAviso } from "../formulario.js";

const usuario = iniciarCasca();

const lista = document.getElementById("lista");
const filtros = document.getElementById("filtros");
const aviso = document.getElementById("aviso");
const contagem = document.getElementById("contagem");

let disciplinaAtual = new URLSearchParams(location.search).get("disciplina") ?? "";

function cartao(item) {
  const melhor = item.melhor_aproveitamento;
  return el(
    "li",
    {},
    el(
      "article",
      { class: "card card-link cartao-quiz", "data-cor": melhor === 100 ? "ok" : null },
      el(
        "div",
        { class: "cartao-quiz-chips" },
        el("span", { class: "chip chip-info" }, item.disciplina),
        el("span", { class: "chip" }, `Nível ${item.nivel}`),
      ),
      el("h2", {}, el("a", { href: `quiz.html?id=${item.id}` }, item.titulo)),
      el("p", {}, item.descricao),
      el(
        "footer",
        {},
        el("span", {}, plural(item.total_questoes, "questão", "questões")),
        melhor === null
          ? el("span", {}, "Ainda não feito")
          : el("span", { class: melhor === 100 ? "chip chip-ok" : "chip" }, `Melhor: ${melhor}%`),
      ),
    ),
  );
}

function desenharFiltros(disciplinas) {
  const opcoes = [["", "Todas"], ...disciplinas.map((d) => [d, d])];
  filtros.replaceChildren(
    ...opcoes.map(([valor, rotulo]) =>
      el(
        "button",
        {
          type: "button",
          class: "pill",
          "aria-pressed": String(valor === disciplinaAtual),
          onclick: () => escolher(valor),
        },
        rotulo,
      ),
    ),
  );
}

async function carregar() {
  lista.setAttribute("aria-busy", "true");
  try {
    const consulta = disciplinaAtual ? `?disciplina=${encodeURIComponent(disciplinaAtual)}` : "";
    const dados = await quiz(`/quizzes${consulta}`, { autenticado: true });
    desenharFiltros(dados.disciplinas);
    lista.replaceChildren(...dados.quizzes.map(cartao));
    contagem.textContent = `${plural(dados.quizzes.length, "quiz", "quizzes")} na lista.`;
  } catch (erro) {
    lista.replaceChildren();
    mostrarAviso(aviso, erro.message);
  } finally {
    lista.setAttribute("aria-busy", "false");
  }
}

function escolher(disciplina) {
  disciplinaAtual = disciplina;
  const url = new URL(location.href);
  if (disciplina) url.searchParams.set("disciplina", disciplina);
  else url.searchParams.delete("disciplina");
  history.replaceState(null, "", url);
  for (const botao of filtros.querySelectorAll(".pill")) {
    botao.setAttribute("aria-pressed", String(botao.textContent === (disciplina || "Todas")));
  }
  carregar();
}

if (usuario) carregar();
