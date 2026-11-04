import { Link } from "react-router-dom";
import { lerJson } from "../api";
import Estado from "../components/Estado";
import { useAuth } from "../hooks/useAuth";

function Numero({ rotulo, valor }) {
  return (
    <div className="card">
      <p className="font-display text-3xl font-extrabold">{valor}</p>
      <p className="text-sm font-bold text-soft">{rotulo}</p>
    </div>
  );
}

export default function Desempenho() {
  const { usuario } = useAuth();
  const historico = lerJson(`historico:${usuario.email}`, []);
  const acertos = historico.reduce((s, h) => s + h.acertos, 0);
  const respondidas = historico.reduce((s, h) => s + h.total, 0);

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold">Olá, {usuario.nome.split(" ")[0]}</h1>
      <div className="my-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Numero rotulo="XP total" valor={historico.reduce((s, h) => s + h.xp, 0)} />
        <Numero rotulo="Quizzes feitos" valor={historico.length} />
        <Numero rotulo="Aproveitamento" valor={respondidas ? `${Math.round((acertos * 100) / respondidas)}%` : "–"} />
        <Numero rotulo="Questões respondidas" valor={respondidas} />
      </div>
      <Estado vazio={!historico.length} mensagemVazia={<><p>Você ainda não concluiu nenhum quiz.</p><Link to="/quizzes" className="btn-azul">Fazer o primeiro</Link></>}>
        <div className="card overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-sm text-soft">
              <tr><th className="py-2">Quiz</th><th className="text-right">Acertos</th><th className="text-right">XP</th></tr>
            </thead>
            <tbody>
              {historico.map((h, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-3 font-bold">{h.quiz}<span className="block text-sm font-normal text-soft">{h.disciplina} · {new Date(h.data).toLocaleString("pt-BR")}</span></td>
                  <td className="text-right font-extrabold">{h.acertos}/{h.total}</td>
                  <td className="text-right font-extrabold">+{h.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Estado>
    </>
  );
}
