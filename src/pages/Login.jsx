
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../assets/logo.png"

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [modalAberta, setModalAberta] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [modalConfirmacaoAberta, setModalConfirmacaoAberta] = useState(false);
  const [codigo, setCodigo] = useState(["", "", "", ""]);
  const [modalNovaSenhaAberta, setModalNovaSenhaAberta] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");

  
  function handleLogin(event) {
    event.preventDefault();

    // Redireciona para a tela de Reposição.
    navigate("/reposicao");
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
                onClick={() => setModalAberta(true)}
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
          {modalAberta && (
      <div
        className="modal-overlay"
        onClick={() => setModalAberta(false)}
      >
        <section
          className="recovery-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recovery-title"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id="recovery-title">Esqueceu a senha?</h2>

          <p>Redefina a senha em duas etapas</p>

          <form
            onSubmit={(event) => {
            event.preventDefault();
            setModalAberta(false);
            setModalConfirmacaoAberta(true);
          }}
          >
            <input
              type="email"
              placeholder="Email"
              value={emailRecuperacao}
              onChange={(event) => setEmailRecuperacao(event.target.value)}
              required
            />

            <button type="submit">Enviar</button>
          </form>
        </section>
      </div>
    )}
    
    {modalConfirmacaoAberta && (
      <div
        className="modal-overlay"
        onClick={() => setModalConfirmacaoAberta(false)}
      >
        <section
          className="recovery-modal confirmation-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-title"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="confirmation-message" id="confirmation-title">
            Por favor, digite o código
            <br />
            que enviamos agora para:
          </p>

          <strong className="confirmation-email">
            {emailRecuperacao}
          </strong>

          <form
              className="confirmation-form"
              onSubmit={(event) => {
                event.preventDefault();
                setModalConfirmacaoAberta(false);
                setModalNovaSenhaAberta(true);
              }}
            >
            <div className="confirmation-code">
              {codigo.map((digito, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  aria-label={`Dígito ${index + 1} do código`}
                  value={digito}
                  onChange={(event) => {
                    const valor = event.target.value.replace(/\D/g, "");
                    setCodigo((anterior) =>
                      anterior.map((item, i) =>
                        i === index ? valor.slice(-1) : item
                      )
                    );
                  }}
                  required
                />
              ))}
            </div>

            <button type="submit">Verificar</button>
          </form>

          <button
            type="button"
            className="resend-code"
            onClick={() => {
              setCodigo(["", "", "", ""]);
              console.log("Solicitar reenvio do código");
            }}
          >
            Reenviar código
          </button>
        </section>
      </div>
    )}

    
{modalNovaSenhaAberta && (
  <div
    className="modal-overlay"
    onClick={() => setModalNovaSenhaAberta(false)}
  >
    <section
      className="recovery-modal new-password-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-password-title"
      onClick={(event) => event.stopPropagation()}
    >
      <h2 id="new-password-title">Crie uma nova senha</h2>

      
          <form
            onSubmit={(event) => {
              event.preventDefault();

              setModalNovaSenhaAberta(false);
              setNovaSenha("");
              setConfirmarNovaSenha("");

              alert("Senha alterada com sucesso!");
            }}
          >

        <input
          type="password"
          placeholder="Nova senha"
          value={novaSenha}
          onChange={(event) => setNovaSenha(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirmar senha"
          value={confirmarNovaSenha}
          onChange={(event) =>
            setConfirmarNovaSenha(event.target.value)
          }
          required
        />

        <button type="submit">Alterar senha</button>
      </form>
    </section>
  </div>
)}


    </main>
  );
}
