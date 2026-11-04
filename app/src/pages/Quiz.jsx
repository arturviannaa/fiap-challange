import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { gravarJson, lerJson, obterQuiz } from "../api";
import Estado from "../components/Estado";
import { useAuth } from "../hooks/useAuth";
import useApi from "../hooks/useApi";

export default function Quiz() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const buscar = useCallback(() => obterQuiz(id), [id]);
  const { dados: quiz, carregando, erro, recarregar } = useApi(buscar);
  const [atual, setAtual] = useState(0);
  const [escolha, setEscolha] = useState(undefined);
  const [acertos, setAcertos] = useState(0);
  const [fim, setFim] = useState(null);

  function responder(i) {
    setEscolha(i);
    if (i === quiz.questoes[atual].correta) setAcertos(acertos + 1);
  }

  function continuar() {
    if (atual + 1 < quiz.questoes.length) {
      setAtual(atual + 1);
      setEscolha(undefined);
      return;
    }
    const total = quiz.questoes.length;
    const xp = acertos * 10 + (acertos === total ? 20 : 0);
    const chave = `historico:${usuario.email}`;
    gravarJson(chave, [{ quiz: quiz.titulo, disciplina: quiz.disciplina, acertos, total, xp, data: new Date().toISOString() }, ...lerJson(chave, [])]);
    setFim({ total, xp });
  }

  return (
    <Estado carregando={carregando} erro={erro} onTentar={recarregar}>
      {quiz && fim && (
        <section className="card mx-auto max-w-xl text-center">
          <img src="/img/comemorando.webp" alt="" className="mx-auto h-40 w-auto" />
          <h1 className="mt-4 font-display text-3xl font-extrabold">Você acertou {acertos} de {fim.total}</h1>
          <p className="mt-2 text-lg font-bold text-azul">+{fim.xp} XP</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/desempenho" className="btn-azul">Ver desempenho</Link>
            <Link to="/quizzes" className="btn-claro">Outro quiz</Link>
          </div>
        </section>
      )}
      {quiz && !fim && (
        <Pergunta questao={quiz.questoes[atual]} numero={atual + 1} total={quiz.questoes.length} disciplina={quiz.disciplina} escolha={escolha} onResponder={responder} onContinuar={continuar} />
      )}
    </Estado>
  );
}

function Pergunta({ questao, numero, total, disciplina, escolha, onResponder, onContinuar }) {
  const respondida = escolha !== undefined;
  const cor = (i) =>
    !respondida ? "border-line hover:border-azul" : i === questao.correta ? "border-ok bg-ok-claro" : i === escolha ? "border-err bg-err-claro" : "border-line opacity-60";

  return (
    <section className="mx-auto max-w-2xl">
      <progress value={numero} max={total} className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-line [&::-webkit-progress-value]:bg-azul [&::-moz-progress-bar]:bg-azul" />
      <p className="mt-4 text-sm font-bold text-azul-escuro">{disciplina} · Questão {numero} de {total}</p>
      <h1 className="mt-2 font-display text-xl font-extrabold md:text-2xl">{questao.enunciado}</h1>
      <div className="mt-5 flex flex-col gap-3">
        {questao.alternativas.map((texto, i) => (
          <button key={i} disabled={respondida} onClick={() => onResponder(i)} className={`rounded-2xl border-2 bg-white p-4 text-left font-bold transition ${cor(i)}`}>
            {String.fromCharCode(65 + i)}. {texto}
          </button>
        ))}
      </div>
      {respondida ? (
        <div className={`card mt-5 ${escolha === questao.correta ? "border-ok" : "border-err"}`}>
          <p className="font-extrabold">{escolha === questao.correta ? "Correto!" : `Resposta certa: ${String.fromCharCode(65 + questao.correta)}`}</p>
          <p className="mt-2 text-soft">{questao.explicacao}</p>
          <button className="btn-azul mt-4 w-full" onClick={onContinuar}>{numero === total ? "Ver resultado" : "Continuar"}</button>
        </div>
      ) : (
        <button className="btn-claro mt-5 w-full" onClick={() => onResponder(null)}>Não sei</button>
      )}
    </section>
  );
}
