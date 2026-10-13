
import React from "react";
import "./CriarConta.css";
import logo from "../assets/logo.png";

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
  function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const senha = data.get("senha");
    const confirmarSenha = data.get("confirmarSenha");

    if (senha !== confirmarSenha) {
      alert("As senhas não coincidem.");
      return;
    }

    alert("Visual da tela pronto! A integração do cadastro será feita depois.");
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

          <button type="submit" className="register-button">
            Criar
          </button>
        </form>

        <button
          type="button"
          className="register-back"
          onClick={() => window.history.back()}
        >
          Já tenho conta!
        </button>
      </section>
    </main>
  );
}

export default CriarConta;
