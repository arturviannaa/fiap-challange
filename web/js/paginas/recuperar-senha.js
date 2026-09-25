import { auth } from "../api.js";
import { conferirPreenchidos, esconderAviso, ligarOlhos, mostrarAviso, ocupar } from "../formulario.js";
import { limparSessao } from "../sessao.js";

const pedido = document.getElementById("pedido");
const redefinicao = document.getElementById("redefinicao");
const avisoPedido = document.getElementById("aviso-pedido");
const avisoRedefinicao = document.getElementById("aviso-redefinicao");
const titulo = document.getElementById("titulo");
const subtitulo = document.getElementById("subtitulo");

ligarOlhos();

function mostrarPasso(passo) {
  const primeiro = passo === 1;
  pedido.hidden = !primeiro;
  redefinicao.hidden = primeiro;
  titulo.textContent = primeiro ? "Recuperar senha" : "Digite o código";
  subtitulo.textContent = primeiro
    ? "Informe o e-mail da sua conta para receber um código."
    : `Enviamos um código para ${pedido.email.value.trim()}, se ele tiver conta.`;
  // Leva o foco para o titulo: o leitor de tela anuncia que a etapa mudou.
  titulo.focus();
}

pedido.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  esconderAviso(avisoPedido);
  const faltando = conferirPreenchidos(pedido);
  if (faltando) return mostrarAviso(avisoPedido, faltando);

  const liberar = ocupar(pedido.querySelector("[type=submit]"), "Enviando…");
  try {
    const resposta = await auth("/conta/recuperar-senha", {
      metodo: "POST",
      corpo: { email: pedido.email.value },
    });
    liberar();
    mostrarPasso(2);
    // Sem servidor de e-mail no ambiente de demonstracao, o codigo volta na resposta.
    if (resposta.codigo_demo) {
      mostrarAviso(
        avisoRedefinicao,
        `Ambiente de demonstração: o código que iria por e-mail é ${resposta.codigo_demo}.`,
        "info",
      );
    } else {
      mostrarAviso(avisoRedefinicao, resposta.mensagem, "info");
    }
  } catch (erro) {
    liberar();
    mostrarAviso(avisoPedido, erro.message);
  }
});

redefinicao.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  esconderAviso(avisoRedefinicao);
  const faltando = conferirPreenchidos(redefinicao);
  if (faltando) return mostrarAviso(avisoRedefinicao, faltando);

  const liberar = ocupar(redefinicao.querySelector("[type=submit]"), "Trocando…");
  try {
    await auth("/conta/redefinir-senha", {
      metodo: "POST",
      corpo: {
        email: pedido.email.value,
        codigo: redefinicao.codigo.value,
        nova_senha: redefinicao.nova_senha.value,
      },
    });
    // Trocar a senha derruba todas as sessoes no servidor; a deste navegador sai junto.
    limparSessao();
    const email = encodeURIComponent(pedido.email.value.trim());
    location.assign(`entrar.html?email=${email}&senha-trocada`);
  } catch (erro) {
    liberar();
    mostrarAviso(avisoRedefinicao, erro.message);
  }
});

document.getElementById("outro-email").addEventListener("click", () => {
  redefinicao.reset();
  esconderAviso(avisoRedefinicao);
  mostrarPasso(1);
  pedido.email.select();
});
