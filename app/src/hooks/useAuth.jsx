import { createContext, useContext, useState } from "react";
import { gravarJson, lerJson } from "../api";

const USUARIO_DE_TESTE = { nome: "Aluno Teste", email: "aluno@anamnea.com", senha: "teste123" };
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => lerJson("usuario", null));

  function salvarSessao(dados) {
    const sessao = { nome: dados.nome, email: dados.email };
    gravarJson("usuario", sessao);
    setUsuario(sessao);
  }

  function entrar(email, senha) {
    const contas = [USUARIO_DE_TESTE, ...lerJson("contas", [])];
    const conta = contas.find((c) => c.email === email.trim().toLowerCase() && c.senha === senha);
    if (!conta) throw new Error("E-mail ou senha incorretos.");
    salvarSessao(conta);
  }

  function cadastrar(nome, email, senha) {
    const contas = lerJson("contas", []);
    email = email.trim().toLowerCase();
    if ([USUARIO_DE_TESTE, ...contas].some((c) => c.email === email)) throw new Error("Esse e-mail já tem conta.");
    gravarJson("contas", [...contas, { nome: nome.trim(), email, senha }]);
    salvarSessao({ nome: nome.trim(), email });
  }

  function sair() {
    localStorage.removeItem("usuario");
    setUsuario(null);
  }

  return <AuthContext.Provider value={{ usuario, entrar, cadastrar, sair }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
