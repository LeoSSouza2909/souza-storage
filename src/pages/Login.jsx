
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../assets/logo.png"

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);

  function handleLogin(event) {
    event.preventDefault();

    // Aqui você poderá integrar a API de autenticação depois.
    console.log("Usuário:", usuario);
    console.log("Senha:", senha);
  }

  return (
    <main className="login-page">
      <section className="brand-section">
        <div className="brand-logo">
          <img
            src={logo}
            alt="Souza Storage"
            className="brand-image"
            />
        </div>
      </section>

      <section className="login-section">
        <div className="login-card">
          <h2>Login</h2>

          <form onSubmit={handleLogin}>
            <label className="login-input">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20v-2a7 7 0 0 1 14 0v2" />
              </svg>

              <input
                type="text"
                placeholder="Usuário"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label className="login-input">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>

              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <div className="login-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                />
                <span className="toggle-switch" />
                <span>Lembrar</span>
              </label>

              <button
                type="button"
                className="forgot-password"
                onClick={() =>
                  alert("Adicione aqui a recuperação de senha.")
                }
              >
                Esqueci a senha
              </button>
            </div>

            <button type="submit" className="login-button">
              Login
            </button>
          </form>

          <button
            type="button"
            className="create-account"
            onClick={() => navigate("/criar-conta")}
          >
            Criar Conta
          </button>
        </div>
      </section>
    </main>
  );
}
