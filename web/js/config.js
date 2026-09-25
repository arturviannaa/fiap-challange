// Endereco dos dois servicos. Em localhost aponta para as portas do
// docker compose; publicado, para os subdominios de cada servico.
const local = ["localhost", "127.0.0.1"].includes(location.hostname);

export const URL_AUTH = local ? `http://${location.hostname}:8092` : "https://challenge-auth.pervian.tech";
export const URL_QUIZ = local ? `http://${location.hostname}:8093` : "https://challenge-quiz.pervian.tech";
