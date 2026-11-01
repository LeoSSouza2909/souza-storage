import React, { useState } from "react";
import "./PedidoModal.css";

export default function PedidoModal({ pecas = [], onClose }) {
  const [pesquisa, setPesquisa] = useState("");

  const pecasFiltradas = pecas.filter((peca) =>
    `${peca.nome || ""} ${peca.codigo || ""}`
      .toLowerCase()
      .includes(pesquisa.trim().toLowerCase()),
  );

  return (
    <div
      className="pedido-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="pedido-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Confirme as Peças"
      >
        <div className="pedido-modal-topo">
          <header className="pedido-modal-header">
            <h2>Confirme as Peças</h2>
          </header>

          <button
            type="button"
            className="pedido-download-button"
            aria-label="Baixar PDF"
            title="Baixar PDF"
            onClick={() => alert("O download do PDF será implementado depois.")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3V15" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 19H19" />
            </svg>
          </button>
        </div>

        <label className="pedido-modal-search">
          <input
            type="search"
            placeholder="Pesquisar"
            value={pesquisa}
            onChange={(event) => setPesquisa(event.target.value)}
            aria-label="Pesquisar peças do pedido"
          />

          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5 5" />
          </svg>
        </label>

        <div className="pedido-modal-lista">
          {pecasFiltradas.length > 0 ? (
            <div className="pedido-modal-grid">
              {pecasFiltradas.map((peca) => (
                <div className="pedido-modal-peca" key={peca.id}>
                  {peca.imagem ? (
                    <img src={peca.imagem} alt={peca.nome} />
                  ) : (
                    <div className="pedido-modal-imagem-vazia">IMG</div>
                  )}

                  <span>{peca.nome}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="pedido-modal-vazio">
              {pesquisa.trim()
                ? "Nenhuma peça encontrada."
                : "Nenhuma peça disponível."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
