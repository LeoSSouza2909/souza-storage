import React, { useState } from "react";
import "./PedidoModal.css";
import { requisicaoApi } from "../services/api";

export default function PedidoModal({ pecas = [], onClose }) {
  const [pesquisa, setPesquisa] = useState("");
  const [selecionadas, setSelecionadas] = useState([]);
  const [quantidades, setQuantidades] = useState({});
  const [etapa, setEtapa] = useState("selecao");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  const pecasFiltradas = pecas.filter((peca) =>
    `${peca.produto || ""} ${peca.marca || ""}`
      .toLowerCase()
      .includes(pesquisa.trim().toLowerCase()),
  );

  const pecasSelecionadas = pecas.filter((peca) =>
    selecionadas.includes(peca.id),
  );

  const todasSelecionadas =
    pecasFiltradas.length > 0 &&
    pecasFiltradas.every((peca) => selecionadas.includes(peca.id));

  function alternarSelecao(id) {
    setSelecionadas((anterior) => {
      if (anterior.includes(id)) {
        return anterior.filter((item) => item !== id);
      }

      setQuantidades((quantidadesAnteriores) => ({
        ...quantidadesAnteriores,
        [id]: quantidadesAnteriores[id] || "1",
      }));

      return [...anterior, id];
    });
  }

  function alternarTodasSelecoes() {
    const idsVisiveis = pecasFiltradas.map((peca) => peca.id);

    setSelecionadas((anterior) => {
      if (todasSelecionadas) {
        return anterior.filter((id) => !idsVisiveis.includes(id));
      }

      setQuantidades((quantidadesAnteriores) => {
        const novasQuantidades = { ...quantidadesAnteriores };

        idsVisiveis.forEach((id) => {
          if (!anterior.includes(id)) {
            novasQuantidades[id] = novasQuantidades[id] || "1";
          }
        });

        return novasQuantidades;
      });

      return [...new Set([...anterior, ...idsVisiveis])];
    });
  }

  function atualizarQuantidade(id, valor) {
    setQuantidades((anterior) => ({
      ...anterior,
      [id]: valor,
    }));
  }

  function avancarParaQuantidades() {
    if (selecionadas.length === 0) return;

    setErro("");
    setEtapa("quantidades");
  }

  async function criarPedido() {
    if (selecionadas.length === 0 || gerando) return;

    const produtosDoPedido = selecionadas.map((id) => ({
      id,
      quantidade: Number(quantidades[id]),
    }));

    const quantidadeInvalida = produtosDoPedido.some(
      (produto) =>
        !Number.isSafeInteger(produto.quantidade) || produto.quantidade < 1,
    );

    if (quantidadeInvalida) {
      setErro("Informe uma quantidade inteira maior que zero para cada peça.");
      return;
    }

    try {
      setGerando(true);
      setErro("");

      const resposta = await requisicaoApi("/api/pedidos", {
        method: "POST",
        body: JSON.stringify({ produtos: produtosDoPedido }),
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
        aria-label={
          etapa === "selecao" ? "Confirme as Peças" : "Informe as quantidades"
        }
      >
        <div className="pedido-modal-topo">
          <header className="pedido-modal-header">
            <h2>
              {etapa === "selecao"
                ? "Confirme as Peças"
                : "Informe as Quantidades"}
            </h2>
          </header>

          {etapa === "selecao" ? (
            <button
              type="button"
              className="pedido-download-button"
              aria-label="Avançar para quantidades"
              title="Avançar para quantidades"
              disabled={selecionadas.length === 0 || gerando}
              onClick={avancarParaQuantidades}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3V15" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 19H19" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className="pedido-download-button"
              aria-label="Voltar para seleção"
              title="Voltar para seleção"
              disabled={gerando}
              onClick={() => {
                setErro("");
                setEtapa("selecao");
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {etapa === "selecao" ? (
          <>
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
          </>
        ) : (
          <>
            <p className="pedido-modal-contador">
              {pecasSelecionadas.length} peça(s) no pedido
            </p>

            {erro && (
              <p className="pedido-modal-erro" role="alert">
                {erro}
              </p>
            )}

            <div className="pedido-modal-lista pedido-quantidades-lista">
              {pecasSelecionadas.map((peca) => (
                <div className="pedido-quantidade-item" key={peca.id}>
                  {peca.imagem ? (
                    <img src={peca.imagem} alt={peca.produto} />
                  ) : (
                    <div className="pedido-modal-imagem-vazia">IMG</div>
                  )}

                  <div className="pedido-quantidade-info">
                    <strong title={peca.produto}>{peca.produto}</strong>
                    <small>{peca.marca}</small>
                  </div>

                  <label className="pedido-quantidade-campo">
                    <span>Quantidade</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quantidades[peca.id] ?? "1"}
                      onChange={(event) =>
                        atualizarQuantidade(peca.id, event.target.value)
                      }
                      disabled={gerando}
                    />
                  </label>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="pedido-confirmar-button"
              onClick={criarPedido}
              disabled={gerando || pecasSelecionadas.length === 0}
            >
              {gerando ? "Gerando PDF..." : "Confirmar e gerar PDF"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
