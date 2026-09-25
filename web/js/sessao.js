// Token e dados do aluno logado. O localStorage pode falhar (aba anonima,
// armazenamento bloqueado): toda leitura e escrita fica dentro de try/catch.

const CHAVE_TOKEN = "anamnea.token";
const CHAVE_USUARIO = "anamnea.usuario";

// Sem armazenamento, a sessao dura so ate recarregar a pagina.
let sessaoEmMemoria = null;

export function salvarSessao(token, usuario) {
  try {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  } catch {
    sessaoEmMemoria = { token, usuario };
  }
}

export function token() {
  try {
    return localStorage.getItem(CHAVE_TOKEN) ?? sessaoEmMemoria?.token ?? null;
  } catch {
    return sessaoEmMemoria?.token ?? null;
  }
}

export function usuario() {
  try {
    const bruto = localStorage.getItem(CHAVE_USUARIO);
    return bruto ? JSON.parse(bruto) : sessaoEmMemoria?.usuario ?? null;
  } catch {
    return sessaoEmMemoria?.usuario ?? null;
  }
}

export function limparSessao() {
  sessaoEmMemoria = null;
  try {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
  } catch {
    // nada a limpar
  }
}

export function irParaEntrar() {
  const voltar = location.pathname + location.search;
  location.replace(`entrar.html?voltar=${encodeURIComponent(voltar)}`);
}

// Telas internas chamam isto antes de tudo: sem token, volta para o login.
export function exigirSessao() {
  if (!token()) {
    irParaEntrar();
    return null;
  }
  return usuario();
}

// So aceita caminho do proprio site, para o ?voltar= nao virar redirecionamento aberto.
export function destinoDepoisDoLogin() {
  const voltar = new URLSearchParams(location.search).get("voltar");
  return voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "quizzes.html";
}
