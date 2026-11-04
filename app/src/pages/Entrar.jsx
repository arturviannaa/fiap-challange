import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Formulario from "../components/Formulario";
import { useAuth } from "../hooks/useAuth";

export default function Entrar() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [erro, setErro] = useState("");

  function enviar({ email, senha }) {
    try {
      entrar(email, senha);
      navegar(local.state?.voltar ?? "/quizzes", { replace: true });
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <Formulario
      titulo="Entrar"
      campos={[{ nome: "email", rotulo: "E-mail", tipo: "email" }, { nome: "senha", rotulo: "Senha", tipo: "password" }]}
      botao="Entrar"
      erro={erro}
      onEnviar={enviar}
      rodape={<p className="text-center text-sm text-soft">Não tem conta? <Link to="/cadastro" className="font-bold text-azul">Criar conta</Link></p>}
    />
  );
}
