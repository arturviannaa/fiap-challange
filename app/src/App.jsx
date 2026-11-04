import { Route, Routes } from "react-router-dom";
import Cabecalho from "./components/Cabecalho";
import RotaPrivada from "./components/RotaPrivada";
import Cadastro from "./pages/Cadastro";
import Desempenho from "./pages/Desempenho";
import Entrar from "./pages/Entrar";
import Inicio from "./pages/Inicio";
import NaoEncontrada from "./pages/NaoEncontrada";
import Quiz from "./pages/Quiz";
import Quizzes from "./pages/Quizzes";

export default function App() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route element={<RotaPrivada />}>
            <Route path="/quizzes" element={<Quizzes />} />
            <Route path="/quizzes/:id" element={<Quiz />} />
            <Route path="/desempenho" element={<Desempenho />} />
          </Route>
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </main>
    </>
  );
}
