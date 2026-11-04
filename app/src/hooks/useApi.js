import { useCallback, useEffect, useState } from "react";

export default function useApi(buscar) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      setDados(await buscar());
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [buscar]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { dados, carregando, erro, recarregar: carregar };
}
