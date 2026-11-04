import { Link } from "react-router-dom";

export default function NaoEncontrada() {
  return (
    <div className="card text-center">
      <h1 className="font-display text-2xl font-extrabold">Página não encontrada</h1>
      <Link to="/" className="btn-azul mt-4">Voltar ao início</Link>
    </div>
  );
}
