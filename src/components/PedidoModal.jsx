import React, { useState } from "react";
import "./PedidoModal.css";
import { requisicaoApi } from "../services/api";

export default function PedidoModal({ pecas = [], onClose }) {
  const [pesquisa, setPesquisa] = useState("");
  const [selecionadas, setSelecionadas] = useState([]);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  const pecasFiltradas = pecas.filter((peca) =>
    `${peca.produto || ""} ${peca.marca || ""}`
      .toLowerCase()
      .includes(pesquisa.trim().toLowerCase()),
  );

  const todasSelecionadas =
    pecasFiltradas.length > 0 &&
    pecasFiltradas.every((peca) => selecionadas.includes(peca.id));

  function alternarSelecao(id) {
    setSelecionadas((anterior) =>
      anterior.includes(id)
        ? anterior.filter((item) => item !== id)
        : [...anterior, id],
    );
  }

  function alternarTodasSelecoes() {
    const idsVisiveis = pecasFiltradas.map((peca) => peca.id);

    setSelecionadas((anterior) => {
      if (todasSelecionadas) {
        return anterior.filter((id) => !idsVisiveis.includes(id));
      }

      return [...new Set([...anterior, ...idsVisiveis])];
    });
  }

  async function criarPedido() {
    if (selecionadas.length === 0 || gerando) return;

    try {
      setGerando(true);
      setErro("");

      const resposta = await requisicaoApi("/api/pedidos", {
        method: "POST",
        body: JSON.stringify({ ids: selecionadas }),
      });

      if (resposta.url) {
        window.open(resposta.url, "_blank");
      }

      onClose();
    } catch (erro) {
      setErro(erro.message || "Não foi possível gerar o pedido.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div
      className="pedido-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !gerando) {
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
            aria-label="Gerar PDF"
            title="Gerar PDF"
            disabled={selecionadas.length === 0 || gerando}
            onClick={criarPedido}
          >
            {gerando ? (
              <span className="pedido-carregando">...</span>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3V15" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 19H19" />
              </svg>
            )}
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

        {pecasFiltradas.length > 0 && (
          <button
            type="button"
            className="pedido-selecionar-todos"
            onClick={alternarTodasSelecoes}
            disabled={gerando}
          >
            {todasSelecionadas ? "Desmarcar todos" : "Selecionar todos"}
          </button>
        )}

        <p className="pedido-modal-contador">
          {selecionadas.length} peça(s) selecionada(s)
        </p>

        {erro && (
          <p className="pedido-modal-erro" role="alert">
            {erro}
          </p>
        )}

        <div className="pedido-modal-lista">
          {pecasFiltradas.length > 0 ? (
            <div className="pedido-modal-grid">
              {pecasFiltradas.map((peca) => {
                const selecionada = selecionadas.includes(peca.id);

                return (
                  <button
                    type="button"
                    className={`pedido-modal-peca ${
                      selecionada ? "pedido-peca-selecionada" : ""
                    }`}
                    key={peca.id}
                    onClick={() => alternarSelecao(peca.id)}
                    aria-pressed={selecionada}
                    disabled={gerando}
                  >
                    {peca.imagem ? (
                      <img src={peca.imagem} alt={peca.produto} />
                    ) : (
                      <div className="pedido-modal-imagem-vazia">IMG</div>
                    )}

                    <span title={peca.produto}>{peca.produto}</span>
                    <small>{peca.marca}</small>

                    {selecionada && (
                      <span className="pedido-modal-check">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="pedido-modal-vazio">
              {pesquisa.trim()
                ? "Nenhuma peça encontrada."
                : "Nenhuma peça disponível para pedido."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
