import { URL_AUTH, URL_QUIZ } from "./config.js";
import { irParaEntrar, limparSessao, token } from "./sessao.js";

export class ErroDaApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

async function pedir(base, caminho, { metodo = "GET", corpo, autenticado = false } = {}) {
  const cabecalhos = {};
  if (corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
  const atual = token();
  if (atual) cabecalhos.Authorization = `Bearer ${atual}`;

  let resposta;
  try {
    resposta = await fetch(base + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroDaApi(0, "Sem conexão com o servidor. Confira sua internet e tente de novo.");
  }

  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (!resposta.ok) {
    // Sessao vencida numa tela que exige login: volta para entrar e retorna depois.
    if (resposta.status === 401 && autenticado) {
      limparSessao();
      irParaEntrar();
    }
    throw new ErroDaApi(resposta.status, dados?.erro ?? "O servidor não respondeu como esperado. Tente de novo.");
  }
  return dados;
}

// Servico de autenticacao, em C++
export const auth = (caminho, opcoes) => pedir(URL_AUTH, caminho, opcoes);

// Servico de quizzes, em Python
export const quiz = (caminho, opcoes) => pedir(URL_QUIZ, caminho, opcoes);
