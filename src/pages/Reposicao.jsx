import React, { useState } from "react";
import Layout from "../components/Layout.jsx";
import "./Reposicao.css";

// 30 peças fictícias para testar a tela
const pecasTeste = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  nome: `Peça de teste ${index + 1}`,
  imagem: "",
}));

export default function Reposicao({ pecasCadastradas }) {
  const [pesquisa, setPesquisa] = useState("");

  const pecas = pecasCadastradas ?? pecasTeste;

  const pecasFiltradas = pecas.filter((peca) =>
    (peca.nome || "").toLowerCase().includes(pesquisa.trim().toLowerCase()),
  );

  function enviarPedido() {
    alert("O envio do pedido será conectado às peças selecionadas.");
  }

  return (
    <Layout titulo="REPOSIÇÃO">
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

      <section className="reposicao-content" aria-label="Lista de peças">
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

                <span className="reposicao-piece-name">{peca.nome}</span>
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
    </Layout>
  );
}
