import { icone } from "./dom.js";

// Caixa de aviso com role="alert": o leitor de tela anuncia assim que o texto muda.
export function mostrarAviso(caixa, mensagem, tipo = "erro") {
  caixa.className = `aviso aviso-${tipo}`;
  caixa.textContent = mensagem;
  caixa.hidden = false;
}

export function esconderAviso(caixa) {
  caixa.hidden = true;
  caixa.textContent = "";
}

// Trava o botao enquanto o pedido esta no ar e devolve a funcao que destrava.
export function ocupar(botao, textoOcupado) {
  const original = botao.textContent;
  botao.disabled = true;
  botao.setAttribute("aria-busy", "true");
  botao.textContent = textoOcupado;
  return () => {
    botao.disabled = false;
    botao.removeAttribute("aria-busy");
    botao.textContent = original;
  };
}

// Campos obrigatorios vazios: marca, foca o primeiro e devolve a mensagem.
export function conferirPreenchidos(formulario) {
  let primeiro = null;
  for (const campo of formulario.querySelectorAll("[required]")) {
    const vazio = !campo.value.trim();
    campo.setAttribute("aria-invalid", String(vazio));
    if (vazio && !primeiro) primeiro = campo;
  }
  if (primeiro) {
    primeiro.focus();
    const rotulo = formulario.querySelector(`label[for="${primeiro.id}"]`)?.textContent ?? "o campo";
    return `Preencha ${rotulo.toLowerCase()}.`;
  }
  return null;
}

// O olho de revelar a senha: troca o tipo do campo e o estado do botao.
export function ligarOlhos(raiz = document) {
  for (const botao of raiz.querySelectorAll(".campo-senha-botao")) {
    const campo = document.getElementById(botao.getAttribute("aria-controls"));
    botao.replaceChildren(icone("olho"));
    botao.addEventListener("click", () => {
      const revelada = campo.type === "password";
      campo.type = revelada ? "text" : "password";
      botao.setAttribute("aria-pressed", String(revelada));
      botao.setAttribute("aria-label", revelada ? "Esconder senha" : "Mostrar senha");
      botao.replaceChildren(icone(revelada ? "olho-fechado" : "olho"));
    });
  }
}
