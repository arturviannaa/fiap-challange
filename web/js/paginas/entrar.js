import { auth } from "../api.js";
import { conferirPreenchidos, esconderAviso, ligarOlhos, mostrarAviso, ocupar } from "../formulario.js";
import { destinoDepoisDoLogin, salvarSessao, token } from "../sessao.js";

// Ja logado nao precisa ver o formulario.
if (token()) location.replace(destinoDepoisDoLogin());

const formulario = document.getElementById("formulario");
const aviso = document.getElementById("aviso");

ligarOlhos();

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  esconderAviso(aviso);
  const faltando = conferirPreenchidos(formulario);
  if (faltando) return mostrarAviso(aviso, faltando);

  const liberar = ocupar(formulario.querySelector("[type=submit]"), "Entrando…");
  try {
    const sessao = await auth("/conta/login", {
      metodo: "POST",
      corpo: { email: formulario.email.value, senha: formulario.senha.value },
    });
    salvarSessao(sessao.token, sessao.usuario);
    location.assign(destinoDepoisDoLogin());
  } catch (erro) {
    liberar();
    mostrarAviso(aviso, erro.message);
    formulario.senha.select();
  }
});
