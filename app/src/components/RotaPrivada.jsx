import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function RotaPrivada() {
  const { usuario } = useAuth();
  const local = useLocation();
  return usuario ? <Outlet /> : <Navigate to="/entrar" replace state={{ voltar: local.pathname }} />;
}
