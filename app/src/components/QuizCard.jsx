import { Link } from "react-router-dom";

export default function QuizCard({ quiz }) {
  return (
    <Link to={`/quizzes/${quiz.id}`} className="card flex flex-col gap-2 transition hover:-translate-y-0.5 hover:border-azul">
      <span className="flex gap-2 text-sm font-bold">
        <span className="rounded-full bg-azul-claro px-3 py-1 text-azul-escuro">{quiz.disciplina}</span>
        <span className="rounded-full bg-paper px-3 py-1 text-soft">Nível {quiz.nivel}</span>
      </span>
      <h3 className="font-display text-lg font-extrabold">{quiz.titulo}</h3>
      <p className="text-sm text-soft">{quiz.questoes.length} questões</p>
    </Link>
  );
}
