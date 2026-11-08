import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NotificationProvider } from "./components/NotificationContext";

import Login from "./pages/Login";
import CriarConta from "./pages/CriarConta";
import Reposicao from "./pages/Reposicao";
import Editar from "./pages/Editar";

import { requisicaoApi } from "./services/api";

function App() {
  const [verificando, setVerificando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    async function verificarSessao() {
      const token = localStorage.getItem("token");

      // Sem token salvo, mostra o login normalmente.
      if (!token) {
        setVerificando(false);
        return;
      }

      try {
        await requisicaoApi("/api/auth/verificar");

        setAutenticado(true);
      } catch (erro) {
        // Token inválido ou expirado.
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");

        setAutenticado(false);
      } finally {
        setVerificando(false);
      }
    }

    verificarSessao();
  }, []);

  useEffect(() => {
    function encerrarSessao() {
      setAutenticado(false);
    }

    window.addEventListener("souza-storage-logout", encerrarSessao);

    return () => {
      window.removeEventListener("souza-storage-logout", encerrarSessao);
    };
  }, []);

  if (verificando) {
    return <div>Verificando sessão...</div>;
  }

  return (
    <BrowserRouter>
      <NotificationProvider>
        <Routes>
          <Route
            path="/"
            element={
              autenticado ? <Navigate to="/reposicao" replace /> : <Login />
            }
          />

          <Route path="/criar-conta" element={<CriarConta />} />
          <Route path="/reposicao" element={<Reposicao />} />
          <Route path="/editar" element={<Editar />} />
        </Routes>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
