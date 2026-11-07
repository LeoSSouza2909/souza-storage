import React, { useState, useRef } from "react";
import "./CriarConta.css";
import logo from "../assets/logo.png";
import { useNavigate } from "react-router-dom";
import { requisicaoApi } from "../services/api";

function FieldIcon({ type }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (type) {
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </svg>
      );

    case "document":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M8 13h8M8 17h8" />
        </svg>
      );

    case "email":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );

    case "lock":
      return (
        <svg {...common}>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );

    default:
      return null;
  }
}

function RegisterField({ icon, ...props }) {
  return (
    <label className="register-field">
      <FieldIcon type={icon} />
      <input {...props} />
    </label>
  );
}

function CriarConta() {
  const [modalConfirmacaoAberta, setModalConfirmacaoAberta] = useState(false);

  const [codigo, setCodigo] = useState(["", "", "", ""]);
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erroCadastro, setErroCadastro] = useState("");
  const [carregandoConfirmacao, setCarregandoConfirmacao] = useState(false);
  const [erroConfirmacao, setErroConfirmacao] = useState("");
  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);

  const camposCodigoRef = useRef([]);

  const navigate = useNavigate();

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

  async function handleSubmit(event) {
    event.preventDefault();

    if (carregando) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    const nome = data.get("nome").trim();
    const cnpj = data.get("cnpj").trim();
    const emailCadastro = data.get("email").trim();
    const senha = data.get("senha");
    const confirmarSenha = data.get("confirmarSenha");

    if (senha !== confirmarSenha) {
      setErroCadastro("As senhas não coincidem.");
      return;
    }

    setErroCadastro("");
    setCarregando(true);

    try {
      const resposta = await requisicaoApi("/api/auth/cadastro", {
        method: "POST",
        body: JSON.stringify({
          nome,
          email: emailCadastro,
          cnpj,
          senha,
        }),
      });

      setEmail(resposta.email || emailCadastro);
      setCodigo(["", "", "", ""]);
      setErroConfirmacao("");
      setModalConfirmacaoAberta(true);
    } catch (erro) {
      setErroCadastro(erro.message || "Não foi possível realizar o cadastro.");
    } finally {
      setCarregando(false);
    }
  }

  async function verificarCodigo(event) {
    event.preventDefault();

    if (carregandoConfirmacao) return;

    const codigoCompleto = codigo.join("");

    if (codigoCompleto.length !== 4) {
      setErroConfirmacao("Digite os quatro números do código.");
      return;
    }

    try {
      setCarregandoConfirmacao(true);
      setErroConfirmacao("");

      const resposta = await requisicaoApi("/api/auth/cadastro/verificar", {
        method: "POST",
        body: JSON.stringify({
          email,
          codigo: codigoCompleto,
        }),
      });

      setModalConfirmacaoAberta(false);
      alert(resposta.mensagem || "Conta criada com sucesso!");
      navigate("/");
    } catch (erro) {
      setErroConfirmacao(
        erro.message || "Não foi possível confirmar o código.",
      );
    } finally {
      setCarregandoConfirmacao(false);
    }
  }

  async function reenviarCodigo() {
    if (reenviandoCodigo) return;

    try {
      setReenviandoCodigo(true);
      setErroConfirmacao("");

      const resposta = await requisicaoApi("/api/auth/cadastro/reenviar", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setCodigo(["", "", "", ""]);

      alert(resposta.mensagem || "Novo código enviado com sucesso!");
    } catch (erro) {
      setErroConfirmacao(erro.message || "Não foi possível reenviar o código.");
    } finally {
      setReenviandoCodigo(false);
    }
  }

  return (
    <main className="register-page">
      <div className="register-brand">
        <img src={logo} alt="Souza Storage" />
      </div>

      <section className="register-card">
        <h1>Criar Conta</h1>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="register-name-cnpj">
            <RegisterField
              icon="user"
              type="text"
              name="nome"
              placeholder="Nome"
              aria-label="Nome"
              autoComplete="name"
              required
            />

            <RegisterField
              icon="document"
              type="text"
              name="cnpj"
              placeholder="CNPJ"
              aria-label="CNPJ"
              required
            />
          </div>

          <RegisterField
            icon="email"
            type="email"
            name="email"
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            required
          />

          <RegisterField
            icon="lock"
            type="password"
            name="senha"
            placeholder="Senha"
            aria-label="Senha"
            autoComplete="new-password"
            required
          />

          <RegisterField
            icon="lock"
            type="password"
            name="confirmarSenha"
            placeholder="Confirmar senha"
            aria-label="Confirmar senha"
            autoComplete="new-password"
            required
          />

          {erroCadastro && (
            <p className="register-error" role="alert">
              {erroCadastro}
            </p>
          )}

          <button type="submit" disabled={carregando}>
            {carregando ? "Criando..." : "Criar"}
          </button>
        </form>

        <button
          type="button"
          className="register-back"
          onClick={() => navigate("/")}
        >
          Já tenho conta!
        </button>
      </section>

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

            <strong className="confirmation-email">{email}</strong>

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

              {erroConfirmacao && (
                <p className="register-error" role="alert">
                  {erroConfirmacao}
                </p>
              )}

              <button type="submit" disabled={carregandoConfirmacao}>
                {carregandoConfirmacao ? "Verificando..." : "Verificar"}
              </button>
            </form>

            <button
              type="button"
              className="resend-code"
              onClick={reenviarCodigo}
              disabled={reenviandoCodigo || carregandoConfirmacao}
            >
              {reenviandoCodigo ? "Enviando..." : "Reenviar código"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default CriarConta;
