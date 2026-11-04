import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Inicio() {
  const { usuario } = useAuth();
  return (
    <section className="grid items-center gap-8 rounded-[28px] bg-azul-escuro p-6 text-white md:grid-cols-[1.4fr_1fr] md:p-12">
      <div>
        <h1 className="font-display text-3xl font-extrabold leading-tight md:text-5xl">120 questões do ciclo básico, corrigidas na hora.</h1>
        <p className="mt-4 text-lg text-azul-claro">Oito disciplinas, de Anatomia a Saúde Coletiva. Você responde, vê a alternativa certa e a explicação.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {usuario ? (
            <Link to="/quizzes" className="btn bg-white text-ink">Ir para as questões</Link>
          ) : (
            <>
              <Link to="/cadastro" className="btn bg-white text-ink">Criar conta grátis</Link>
              <Link to="/entrar" className="btn border-2 border-white/40">Já tenho conta</Link>
            </>
          )}
        </div>
      </div>
      <img src="/img/joinha.webp" alt="Vento, o mascote da Lumna" className="mx-auto h-56 w-auto md:h-72" />
    </section>
  );
}
