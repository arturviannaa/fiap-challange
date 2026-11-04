import { useState } from "react";
import { listarQuizzes } from "../api";
import Estado from "../components/Estado";
import QuizCard from "../components/QuizCard";
import useApi from "../hooks/useApi";

export default function Quizzes() {
  const { dados, carregando, erro, recarregar } = useApi(listarQuizzes);
  const [disciplina, setDisciplina] = useState("");
  const [busca, setBusca] = useState("");
  const disciplinas = [...new Set((dados ?? []).map((q) => q.disciplina))].sort();
  const lista = (dados ?? []).filter(
    (q) => (!disciplina || q.disciplina === disciplina) && q.titulo.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold">Escolha um quiz</h1>
      <div className="my-5 flex flex-col gap-3 md:flex-row">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo título" aria-label="Buscar" className="campo mt-0 md:flex-1" />
        <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} aria-label="Disciplina" className="campo mt-0 md:w-60">
          <option value="">Todas as disciplinas</option>
          {disciplinas.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      <Estado carregando={carregando} erro={erro} onTentar={recarregar} vazio={!lista.length} mensagemVazia={<p>Nenhum quiz encontrado com esse filtro.</p>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((q) => <QuizCard key={q.id} quiz={q} />)}
        </div>
      </Estado>
    </>
  );
}
