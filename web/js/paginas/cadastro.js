import { auth } from "../api.js";
import { conferirPreenchidos, esconderAviso, ligarOlhos, mostrarAviso, ocupar } from "../formulario.js";
import { salvarSessao, token } from "../sessao.js";

if (token()) location.replace("quizzes.html");

const formulario = document.getElementById("formulario");
const aviso = document.getElementById("aviso");

ligarOlhos();

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  esconderAviso(aviso);
  const faltando = conferirPreenchidos(formulario);
  if (faltando) return mostrarAviso(aviso, faltando);

  const dados = {
    nome: formulario.nome.value,
    email: formulario.email.value,
    senha: formulario.senha.value,
  };
  const liberar = ocupar(formulario.querySelector("[type=submit]"), "Criando conta…");
  try {
    // As regras de nome, e-mail e senha moram no servico C++; a tela so mostra o que ele responde.
    await auth("/conta/cadastro", { metodo: "POST", corpo: dados });
    const sessao = await auth("/conta/login", {
      metodo: "POST",
      corpo: { email: dados.email, senha: dados.senha },
    });
    salvarSessao(sessao.token, sessao.usuario);
    location.assign("quizzes.html");
  } catch (erro) {
    liberar();
    mostrarAviso(aviso, erro.message);
  }
});
