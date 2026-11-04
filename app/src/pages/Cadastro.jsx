import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Formulario from "../components/Formulario";
import { useAuth } from "../hooks/useAuth";

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navegar = useNavigate();
  const [erro, setErro] = useState("");

  function enviar({ nome, email, senha }) {
    try {
      cadastrar(nome, email, senha);
      navegar("/quizzes");
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <Formulario
      titulo="Criar conta"
      campos={[
        { nome: "nome", rotulo: "Nome", minimo: 2 },
        { nome: "email", rotulo: "E-mail", tipo: "email" },
        { nome: "senha", rotulo: "Senha (mínimo 6 caracteres)", tipo: "password", minimo: 6 },
      ]}
      botao="Criar conta"
      erro={erro}
      onEnviar={enviar}
      rodape={<p className="text-center text-sm text-soft">Já tem conta? <Link to="/entrar" className="font-bold text-azul">Entrar</Link></p>}
    />
  );
}
