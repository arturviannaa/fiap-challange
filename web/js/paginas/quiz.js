import { quiz } from "../api.js";
import { el, icone } from "../dom.js";
import { mostrarAviso } from "../formulario.js";
import { exigirSessao } from "../sessao.js";

const LETRAS = ["A", "B", "C", "D", "E", "F"];

const $ = (id) => document.getElementById(id);
const formulario = $("questao");
const alternativas = $("alternativas");
const painel = $("painel");
const botaoConferir = $("conferir");
const botaoNaoSei = $("nao-sei");
const botaoContinuar = $("continuar");

const estado = {
  tentativaId: null,
  quiz: null,
  indice: 0,
  respondidas: 0,
  ocupado: false,
};

function atualizarProgresso() {
  const total = estado.quiz.questoes.length;
  const progresso = $("progresso");
  progresso.max = total;
  progresso.value = estado.respondidas;
  progresso.setAttribute("aria-valuetext", `${estado.respondidas} de ${total} respondidas`);
  $("contagem").textContent = `${estado.respondidas}/${total}`;
}

function mostrarQuestao() {
  const questao = estado.quiz.questoes[estado.indice];
  const total = estado.quiz.questoes.length;
  $("rotulo-do-quiz").textContent = `${estado.quiz.disciplina} · Questão ${estado.indice + 1} de ${total}`;
  $("enunciado").textContent = questao.enunciado;

  alternativas.replaceChildren(
    ...questao.alternativas.map((texto, indice) =>
      el(
        "label",
        { class: "alternativa" },
        el("input", { type: "radio", name: "escolha", value: String(indice), required: true }),
        el("span", { class: "letra", "aria-hidden": "true" }, LETRAS[indice]),
        el("span", {}, texto),
      ),
    ),
  );

  painel.removeAttribute("data-veredito");
  $("acoes").hidden = false;
  $("veredito").hidden = true;
  botaoContinuar.hidden = true;
  botaoConferir.disabled = true;
  botaoNaoSei.disabled = false;
  $("enunciado").focus();
}

function escolhaAtual() {
  const marcada = formulario.querySelector("input[name=escolha]:checked");
  return marcada ? Number(marcada.value) : null;
}

function mostrarVeredito(correcao, escolha) {
  // Trava as alternativas e pinta a certa, a errada escolhida e apaga o resto.
  alternativas.querySelectorAll(".alternativa").forEach((rotulo, indice) => {
    rotulo.querySelector("input").disabled = true;
    let estadoDaAlternativa = "neutra";
    if (indice === correcao.correta) estadoDaAlternativa = "certa";
    else if (indice === escolha) estadoDaAlternativa = "errada";
    rotulo.dataset.estado = estadoDaAlternativa;
    if (estadoDaAlternativa !== "neutra") {
      rotulo.append(
        el("span", { class: "marcador" }, icone(estadoDaAlternativa === "certa" ? "certo" : "errado", 20, 2)),
        el("span", { class: "sr-only" }, estadoDaAlternativa === "certa" ? "(correta)" : "(sua resposta)"),
      );
    }
  });

  const tipo = correcao.acertou ? "ok" : escolha === null ? "warn" : "err";
  const titulos = {
    ok: "Certo!",
    err: `Resposta certa: ${LETRAS[correcao.correta]}`,
    warn: `Sem chute. A certa é a ${LETRAS[correcao.correta]}`,
  };
  painel.dataset.veredito = tipo;
  $("vento-veredito").src = `img/vento/${correcao.acertou ? "joinha" : "encolhendo"}.webp`;
  $("icone-veredito").replaceChildren(icone(tipo === "ok" ? "certo" : tipo === "warn" ? "duvida" : "errado", 20, 2));
  $("titulo-veredito").textContent = titulos[tipo];
  $("explicacao").textContent = correcao.explicacao;
  $("acoes").hidden = true;
  $("veredito").hidden = false;

  const ultima = estado.indice === estado.quiz.questoes.length - 1;
  botaoContinuar.textContent = ultima ? "Ver resultado" : "Continuar";
  botaoContinuar.className = `btn btn-lg ${{ ok: "btn-ok", err: "btn-perigo", warn: "btn-aviso" }[tipo]}`;
  botaoContinuar.hidden = false;
  botaoContinuar.focus();
}

async function conferir(escolha) {
  if (estado.ocupado) return;
  estado.ocupado = true;
  botaoConferir.disabled = true;
  botaoNaoSei.disabled = true;
  try {
    const correcao = await quiz(`/tentativas/${estado.tentativaId}/respostas`, {
      metodo: "POST",
      corpo: { posicao: estado.quiz.questoes[estado.indice].posicao, escolha },
      autenticado: true,
    });
    estado.respondidas = correcao.respondidas;
    atualizarProgresso();
    mostrarVeredito(correcao, escolha);
  } catch (erro) {
    mostrarAviso($("aviso"), erro.message);
    botaoConferir.disabled = escolhaAtual() === null;
    botaoNaoSei.disabled = false;
  } finally {
    estado.ocupado = false;
  }
}

async function concluir() {
  estado.ocupado = true;
  botaoContinuar.disabled = true;
  try {
    const resultado = await quiz(`/tentativas/${estado.tentativaId}/concluir`, {
      metodo: "POST",
      autenticado: true,
    });
    mostrarResultado(resultado);
  } catch (erro) {
    mostrarAviso($("aviso"), erro.message);
    botaoContinuar.disabled = false;
  } finally {
    estado.ocupado = false;
  }
}

function mostrarResultado(resultado) {
  const gabaritou = resultado.acertos === resultado.total;
  const foiBem = resultado.acertos / resultado.total >= 0.7;
  formulario.hidden = true;
  painel.hidden = true;
  $("resultado").hidden = false;
  $("vento-resultado").src = `img/vento/${foiBem ? "comemorando" : "lendo"}.webp`;
  $("titulo-resultado").textContent = gabaritou
    ? `Gabaritou: ${resultado.total} de ${resultado.total}`
    : `Você acertou ${resultado.acertos} de ${resultado.total}`;
  $("mensagem-resultado").textContent = resultado.primeira_do_dia
    ? gabaritou
      ? "Acertar todas vale 20 XP de bônus, e ele já entrou na conta."
      : "Refaça amanhã para tentar gabaritar: acertar todas vale 20 XP de bônus."
    : "Você já tinha concluído este quiz hoje, então esta rodada não rende XP. Ela serve de revisão.";
  $("acertos").textContent = `${resultado.acertos}/${resultado.total}`;
  $("xp-ganho").textContent = `+${resultado.xp_ganho}`;
  $("xp-total").textContent = String(resultado.xp_total);
  $("refazer").href = `quiz.html?id=${estado.quiz.id}`;
  document.title = `Resultado · ${estado.quiz.titulo} · Anamnea`;
  $("titulo-resultado").focus();
}

formulario.addEventListener("change", () => {
  botaoConferir.disabled = escolhaAtual() === null || estado.ocupado;
});

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const escolha = escolhaAtual();
  if (escolha !== null) conferir(escolha);
});

botaoNaoSei.addEventListener("click", () => conferir(null));

botaoContinuar.addEventListener("click", () => {
  if (estado.ocupado) return;
  if (estado.indice < estado.quiz.questoes.length - 1) {
    estado.indice += 1;
    mostrarQuestao();
  } else {
    concluir();
  }
});

async function iniciar() {
  if (!exigirSessao()) return;
  const id = new URLSearchParams(location.search).get("id");
  try {
    const aberta = await quiz(`/quizzes/${encodeURIComponent(id ?? "")}/tentativas`, {
      metodo: "POST",
      autenticado: true,
    });
    estado.tentativaId = aberta.tentativa_id;
    estado.quiz = aberta.quiz;
    document.title = `${estado.quiz.titulo} · Anamnea`;
    $("carregando").hidden = true;
    formulario.hidden = false;
    painel.hidden = false;
    atualizarProgresso();
    mostrarQuestao();
  } catch (erro) {
    $("carregando").hidden = true;
    const aviso = $("aviso");
    mostrarAviso(aviso, `${erro.message} `);
    aviso.append(el("a", { href: "quizzes.html" }, "Voltar para a lista de quizzes"));
  }
}

iniciar();
