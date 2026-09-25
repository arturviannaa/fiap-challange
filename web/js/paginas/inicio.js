import { token } from "../sessao.js";

// Quem ja entrou ve o atalho para as questoes no lugar de "Criar conta".
const logado = Boolean(token());
for (const bloco of document.querySelectorAll("[data-visitante]")) bloco.hidden = logado;
for (const bloco of document.querySelectorAll("[data-logado]")) bloco.hidden = !logado;
