export default function Estado({ carregando, erro, vazio, mensagemVazia, onTentar, children }) {
  if (carregando) return <p className="card text-soft" role="status">Carregando...</p>;
  if (erro)
    return (
      <div className="card border-err bg-err-claro" role="alert">
        <p className="font-bold text-err">{erro}</p>
        <button className="btn-claro mt-3" onClick={onTentar}>Tentar de novo</button>
      </div>
    );
  if (vazio)
    return (
      <div className="card flex flex-col items-center gap-3 text-center">
        <img src="/img/lendo.webp" alt="" className="h-28 w-auto" />
        {mensagemVazia}
      </div>
    );
  return children;
}
