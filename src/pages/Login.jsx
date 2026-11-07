import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../assets/logo.png";
import { requisicaoApi } from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(
    localStorage.getItem("emailLembrado") || "",
  );

  const [senha, setSenha] = useState("");

  const [lembrar, setLembrar] = useState(
    localStorage.getItem("lembrarUsuario") === "true",
  );

  const [erroLogin, setErroLogin] = useState("");
  const [carregando, setCarregando] = useState(false);

  const [modalAberta, setModalAberta] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [modalConfirmacaoAberta, setModalConfirmacaoAberta] = useState(false);
  const [codigo, setCodigo] = useState(["", "", "", ""]);
  const [modalNovaSenhaAberta, setModalNovaSenhaAberta] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [erroRecuperacao, setErroRecuperacao] = useState("");
  const [carregandoRecuperacao, setCarregandoRecuperacao] = useState(false);
  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);
  const [mensagemReenvio, setMensagemReenvio] = useState("");

  const camposCodigoRef = useRef([]);

  // LEMBRAR LOGIN
  useEffect(() => {
    if (lembrar) {
      localStorage.setItem("lembrarUsuario", "true");
    } else {
      localStorage.removeItem("lembrarUsuario");
      localStorage.removeItem("emailLembrado");
    }
  }, [lembrar]);

  // LOGIN CONECTADO AO BACKEND
  async function handleLogin(event) {
    event.preventDefault();

    setErroLogin("");
    setCarregando(true);

    try {
      const resposta = await requisicaoApi("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: usuario.trim(),
          senha,
        }),
      });

      if (!resposta.token) {
        throw new Error("O servidor não retornou o token de acesso.");
      }

      // Escolher onde armazenar o token
      const armazenamento = lembrar ? localStorage : sessionStorage;
      const outroArmazenamento = lembrar ? sessionStorage : localStorage;

      armazenamento.setItem("token", resposta.token);
      armazenamento.setItem("usuario", JSON.stringify(resposta.usuario));

      // Evitar manter duas sessões simultâneas
      outroArmazenamento.removeItem("token");
      outroArmazenamento.removeItem("usuario");

      // Salvar ou remover o e-mail lembrado
      if (lembrar) {
        localStorage.setItem("emailLembrado", usuario.trim());
      } else {
        localStorage.removeItem("emailLembrado");
      }

      navigate("/reposicao");
    } catch (erro) {
      setErroLogin(erro.message);
    } finally {
      setCarregando(false);
    }
  }

  function atualizarDigito(index, valor) {
    const numeros = valor.replace(/\D/g, "");

    if (!numeros) {
      setCodigo((anterior) =>
        anterior.map((item, i) => (i === index ? "" : item)),
      );
      return;
    }

    const digitos = numeros.split("");

    setCodigo((anterior) => {
      const novoCodigo = [...anterior];

      digitos.forEach((digito, i) => {
        if (index + i < 4) {
          novoCodigo[index + i] = digito;
        }
      });

      return novoCodigo;
    });

    const proximoCampo = Math.min(index + digitos.length, 3);

    camposCodigoRef.current[proximoCampo]?.focus();
  }

  function tratarBackspace(event, index) {
    if (event.key === "Backspace" && !codigo[index] && index > 0) {
      camposCodigoRef.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      camposCodigoRef.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < 3) {
      camposCodigoRef.current[index + 1]?.focus();
    }
  }

  function colarCodigo(event) {
    event.preventDefault();

    const texto = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);

    if (!texto) return;

    const digitos = texto.split("");

    setCodigo([
      digitos[0] || "",
      digitos[1] || "",
      digitos[2] || "",
      digitos[3] || "",
    ]);

    camposCodigoRef.current[Math.min(digitos.length, 3)]?.focus();
  }

  // SOLICITAR CÓDIGO
  async function solicitarCodigo(event) {
    event.preventDefault();

    try {
      setCarregandoRecuperacao(true);
      setErroRecuperacao("");

      await requisicaoApi("/api/auth/senha/solicitar-codigo", {
        method: "POST",
        body: JSON.stringify({
          email: emailRecuperacao.trim(),
        }),
      });

      setCodigo(["", "", "", ""]);
      setModalAberta(false);
      setModalConfirmacaoAberta(true);
    } catch (erro) {
      setErroRecuperacao(erro.message);
    } finally {
      setCarregandoRecuperacao(false);
    }
  }

  // VERIFICAR CÓDIGO
  async function verificarCodigo(event) {
    event.preventDefault();

    try {
      setCarregandoRecuperacao(true);
      setErroRecuperacao("");

      await requisicaoApi("/api/auth/senha/verificar-codigo", {
        method: "POST",
        body: JSON.stringify({
          email: emailRecuperacao.trim(),
          codigo: codigo.join(""),
        }),
      });

      setModalConfirmacaoAberta(false);
      setModalNovaSenhaAberta(true);
    } catch (erro) {
      setErroRecuperacao(erro.message);
    } finally {
      setCarregandoRecuperacao(false);
    }
  }

  // REENVIAR CÓDIGO
  async function reenviarCodigo() {
    try {
      setReenviandoCodigo(true);
      setErroRecuperacao("");
      setMensagemReenvio("");

      const resposta = await requisicaoApi("/api/auth/senha/reenviar-codigo", {
        method: "POST",
        body: JSON.stringify({
          email: emailRecuperacao.trim(),
        }),
      });

      setCodigo(["", "", "", ""]);

      setMensagemReenvio(
        resposta.mensagem || "Um novo código foi enviado para seu e-mail.",
      );
    } catch (erro) {
      setErroRecuperacao(erro.message);
    } finally {
      setReenviandoCodigo(false);
    }
  }

  // ALTERAR SENHA
  async function alterarSenha(event) {
    event.preventDefault();

    if (novaSenha !== confirmarNovaSenha) {
      setErroRecuperacao("As senhas não coincidem.");
      return;
    }

    if (novaSenha.length < 8) {
      setErroRecuperacao("A senha deve possuir pelo menos 8 caracteres.");
      return;
    }

    try {
      setCarregandoRecuperacao(true);
      setErroRecuperacao("");

      const resposta = await requisicaoApi("/api/auth/senha/redefinir", {
        method: "POST",
        body: JSON.stringify({
          email: emailRecuperacao.trim(),
          codigo: codigo.join(""),
          novaSenha,
        }),
      });

      setModalNovaSenhaAberta(false);
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setCodigo(["", "", "", ""]);
      setEmailRecuperacao("");

      alert(resposta.mensagem || "Senha alterada com sucesso!");
    } catch (erro) {
      setErroRecuperacao(erro.message);
    } finally {
      setCarregandoRecuperacao(false);
    }
  }

  return (
    <main className="login-page">
      <section className="brand-section">
        <div className="brand-logo">
          <img src={logo} alt="Souza Storage" className="brand-image" />
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
                type="email"
                placeholder="E-mail"
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

            {erroLogin && (
              <p
                role="alert"
                style={{
                  color: "#d93025",
                  fontSize: "14px",
                  margin: "8px 0",
                  textAlign: "center",
                }}
              >
                {erroLogin}
              </p>
            )}

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

            <button
              type="submit"
              className="login-button"
              disabled={carregando}
            >
              {carregando ? "Entrando..." : "Login"}
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
        <div className="modal-overlay" onClick={() => setModalAberta(false)}>
          <section
            className="recovery-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="recovery-title">Esqueceu a senha?</h2>

            <p>Redefina a senha em duas etapas</p>

            <form onSubmit={solicitarCodigo}>
              <input
                type="email"
                placeholder="E-mail"
                value={emailRecuperacao}
                onChange={(event) => setEmailRecuperacao(event.target.value)}
                required
              />

              {erroRecuperacao && (
                <p className="recovery-error" role="alert">
                  {erroRecuperacao}
                </p>
              )}

              <button type="submit" disabled={carregandoRecuperacao}>
                {carregandoRecuperacao ? "Enviando..." : "Enviar"}
              </button>
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

            <strong className="confirmation-email">{emailRecuperacao}</strong>

            <form className="confirmation-form" onSubmit={verificarCodigo}>
              <div className="confirmation-code">
                {codigo.map((digito, index) => (
                  <input
                    key={index}
                    ref={(elemento) => {
                      camposCodigoRef.current[index] = elemento;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    autoFocus={index === 0}
                    aria-label={`Dígito ${index + 1} do código`}
                    value={digito}
                    onChange={(event) =>
                      atualizarDigito(index, event.target.value)
                    }
                    onKeyDown={(event) => tratarBackspace(event, index)}
                    onPaste={colarCodigo}
                    required
                  />
                ))}
              </div>

              {erroRecuperacao && (
                <p className="recovery-error" role="alert">
                  {erroRecuperacao}
                </p>
              )}

              <button type="submit" disabled={carregandoRecuperacao}>
                {carregandoRecuperacao ? "Verificando..." : "Verificar"}
              </button>
            </form>

            <button
              type="button"
              className="resend-code"
              onClick={reenviarCodigo}
              disabled={reenviandoCodigo}
            >
              {reenviandoCodigo ? "Enviando..." : "Reenviar código"}
            </button>
            {mensagemReenvio && (
              <p className="recovery-success" role="status">
                {mensagemReenvio}
              </p>
            )}
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

            <form onSubmit={alterarSenha}>
              <input
                type="password"
                placeholder="Nova senha"
                value={novaSenha}
                onChange={(event) => setNovaSenha(event.target.value)}
                minLength={8}
                required
              />

              <input
                type="password"
                placeholder="Confirmar senha"
                value={confirmarNovaSenha}
                onChange={(event) => setConfirmarNovaSenha(event.target.value)}
                minLength={8}
                required
              />

              {erroRecuperacao && (
                <p className="recovery-error" role="alert">
                  {erroRecuperacao}
                </p>
              )}

              <button type="submit" disabled={carregandoRecuperacao}>
                {carregandoRecuperacao ? "Alterando..." : "Alterar senha"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
