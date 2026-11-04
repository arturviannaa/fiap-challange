const espera = () => new Promise((r) => setTimeout(r, 400));

async function buscarQuizzes() {
  await espera();
  const resposta = await fetch("/api/quizzes.json");
  if (!resposta.ok) throw new Error("Não foi possível carregar os quizzes.");
  return (await resposta.json()).quizzes;
}

export async function listarQuizzes() {
  return buscarQuizzes();
}

export async function obterQuiz(id) {
  const quiz = (await buscarQuizzes()).find((q) => q.id === Number(id));
  if (!quiz) throw new Error("Quiz não encontrado.");
  return quiz;
}

export function lerJson(chave, padrao) {
  try {
    return JSON.parse(localStorage.getItem(chave)) ?? padrao;
  } catch {
    return padrao;
  }
}

export function gravarJson(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}
