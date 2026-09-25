import { auth } from "./api.js";
import { exigirSessao, limparSessao } from "./sessao.js";

// A casca das telas internas: exige login, mostra o nome e liga o "Sair".
export function iniciarCasca() {
  const usuario = exigirSessao();
  if (!usuario) return null;

  const primeiroNome = usuario.nome.split(" ")[0];
  for (const alvo of document.querySelectorAll("[data-nome-do-aluno]")) alvo.textContent = usuario.nome;
  for (const alvo of document.querySelectorAll("[data-saudacao]")) alvo.textContent = `Olá, ${primeiroNome}`;

  for (const botao of document.querySelectorAll("[data-sair]")) {
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      try {
        await auth("/conta/sair", { metodo: "POST" });
      } catch {
        // Mesmo sem resposta do servidor, a sessao local sai.
      }
      limparSessao();
      location.assign("./");
    });
  }
  return usuario;
}
