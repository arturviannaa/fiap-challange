import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const link = ({ isActive }) => `rounded-full px-4 py-2 font-extrabold ${isActive ? "bg-azul text-white" : "text-soft hover:text-ink"}`;

export default function Cabecalho() {
  const { usuario, sair } = useAuth();
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <Link to="/" className="mr-auto flex items-center gap-2 font-display text-lg font-extrabold">
          <span className="grid size-8 place-items-center rounded-lg bg-azul text-white">A</span>
          Anamnea
        </Link>
        {usuario ? (
          <>
            <nav className="order-last flex w-full justify-center gap-2 sm:order-none sm:w-auto">
              <NavLink to="/quizzes" className={link}>Questões</NavLink>
              <NavLink to="/desempenho" className={link}>Desempenho</NavLink>
            </nav>
            <button className="btn-claro" onClick={sair}>Sair</button>
          </>
        ) : (
          <>
            <Link to="/entrar" className="btn-claro">Entrar</Link>
            <Link to="/cadastro" className="btn-azul">Criar conta</Link>
          </>
        )}
      </div>
    </header>
  );
}
