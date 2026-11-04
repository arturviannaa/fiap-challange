export default function Formulario({ titulo, campos, botao, erro, onEnviar, rodape }) {
  function enviar(e) {
    e.preventDefault();
    onEnviar(Object.fromEntries(new FormData(e.target)));
  }
  return (
    <form onSubmit={enviar} className="card mx-auto flex max-w-md flex-col gap-4">
      <h1 className="font-display text-2xl font-extrabold">{titulo}</h1>
      {campos.map((c) => (
        <label key={c.nome} className="text-sm font-bold text-soft">
          {c.rotulo}
          <input name={c.nome} type={c.tipo ?? "text"} required minLength={c.minimo} className="campo text-base text-ink" />
        </label>
      ))}
      {erro && <p className="rounded-2xl bg-err-claro p-3 font-bold text-err" role="alert">{erro}</p>}
      <button className="btn-azul">{botao}</button>
      {rodape}
    </form>
  );
}
