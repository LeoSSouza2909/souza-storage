
import React, { useState } from "react";
import "./Reposicao.css";
import logo from "../assets/logo.png";

// 30 peças fictícias para testar a tela
const pecasTeste = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  nome: `Peça de teste ${index + 1}`,
  imagem: "",
}));

export default function Reposicao({ pecasCadastradas }) {
  const [pesquisa, setPesquisa] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);

  // Usa as peças cadastradas, caso sejam fornecidas.
  // Caso contrário, exibe as 30 peças de teste.
  const pecas = pecasCadastradas ?? pecasTeste;

  const pecasFiltradas = pecas.filter((peca) =>
    (peca.nome || "")
      .toLowerCase()
      .includes(pesquisa.trim().toLowerCase())
  );

  function selecionarOpcao(opcao) {
    setMenuAberto(false);

    if (opcao === "Repor") {
      alert("A função Repor será conectada às peças selecionadas.");
    } else if (opcao === "Editar") {
      alert("A função Editar será implementada depois.");
    } else {
      alert("A criação de pedidos será implementada depois.");
    }
  }

  function enviarPedido() {
    alert("O envio do pedido será conectado às peças selecionadas.");
  }

  return (
    <main className="reposicao-page">
      <header className="reposicao-header">
        <button
          type="button"
          className={`reposicao-icon-button menu-button ${
            menuAberto ? "menu-ativo" : ""
          }`}
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path className="menu-line menu-line-1" d="M4 7 H28" />
            <path className="menu-line menu-line-2" d="M4 16 H28" />
            <path className="menu-line menu-line-3" d="M4 25 H28" />
          </svg>
        </button>

        <h1>REPOSIÇÃO</h1>

        <button
          type="button"
          className="reposicao-icon-button notification-button"
          aria-label="Notificações"
          aria-expanded={notificacoesAbertas}
          onClick={() =>
            setNotificacoesAbertas((aberto) => !aberto)
          }
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M6 23 H26 L23 19 V12 A7 7 0 0 0 9 12 V19 Z" />
            <path d="M13 26 Q16 30 19 26" />
          </svg>
        </button>
      </header>

      {menuAberto && (
        <nav className="reposicao-menu" aria-label="Menu principal">
          <button
            type="button"
            onClick={() => selecionarOpcao("Repor")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3 21 8 12 13 3 8 12 3Z" />
              <path d="M3 8V17L12 22L21 17V8" />
              <path d="M12 13V22" />
            </svg>
            <span>Repor</span>
          </button>

          <button
            type="button"
            onClick={() => selecionarOpcao("Editar")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20H21" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
            </svg>
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={() => selecionarOpcao("Criar pedido")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4Z" />
            </svg>
            <span>Criar pedido</span>
          </button>
        </nav>
      )}

      {notificacoesAbertas && (
        <div className="reposicao-notifications">
          Nenhuma notificação no momento.
        </div>
      )}

      <div className="reposicao-toolbar">
        <label className="reposicao-search">
          <input
            type="search"
            placeholder="Pesquisar"
            value={pesquisa}
            onChange={(event) => setPesquisa(event.target.value)}
            aria-label="Pesquisar peças"
          />

          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5 5" />
          </svg>
        </label>

        <button
          type="button"
          className="reposicao-send-button"
          onClick={enviarPedido}
        >
          Enviar
        </button>
      </div>

      <section
        className="reposicao-content"
        aria-label="Lista de peças"
      >
        <div className="reposicao-watermark" aria-hidden="true">
          <img src={logo} alt="" />
        </div>

        {pecasFiltradas.length > 0 ? (
          <div className="reposicao-grid">
            {pecasFiltradas.map((peca) => (
              <button
                type="button"
                className="reposicao-piece"
                key={peca.id}
                title={peca.nome}
                aria-label={peca.nome}
                onClick={() => {
                  alert(`Peça selecionada: ${peca.nome}`);
                }}
              >
                {peca.imagem && (
                  <img
                    className="reposicao-piece-image"
                    src={peca.imagem}
                    alt={peca.nome}
                  />
                )}

                <span className="reposicao-piece-name">
                  {peca.nome}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="reposicao-empty">
            <p>
              {pesquisa.trim()
                ? "Nenhuma peça encontrada."
                : "Nenhuma peça cadastrada ainda."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
