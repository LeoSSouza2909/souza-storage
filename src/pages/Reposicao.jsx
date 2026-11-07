import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import { requisicaoApi } from "../services/api";
import "./Reposicao.css";

export default function Reposicao() {
  const [pesquisa, setPesquisa] = useState("");
  const [pecas, setPecas] = useState([]);
  const [selecionadas, setSelecionadas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregarPecas() {
    try {
      setCarregando(true);
      setErro("");

      const resposta = await requisicaoApi("/api/produtos");
      setPecas(resposta.produtos || []);
    } catch (erro) {
      setErro(erro.message || "Não foi possível carregar os produtos.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarPecas();
  }, []);

  const pecasFiltradas = pecas.filter((peca) =>
    (peca.produto || "").toLowerCase().includes(pesquisa.trim().toLowerCase()),
  );

  function alternarSelecao(peca) {
    if (Number(peca.status) !== 0 || enviando) return;

    const idPeca = String(peca.id);

    setSelecionadas((anterior) => {
      if (anterior.includes(idPeca)) {
        return anterior.filter((id) => id !== idPeca);
      }

      return [...anterior, idPeca];
    });
  }

  async function enviarPedido() {
    if (selecionadas.length === 0 || enviando) return;

    try {
      setEnviando(true);
      setErro("");

      const resposta = await requisicaoApi("/api/produtos/reposicao", {
        method: "POST",
        body: JSON.stringify({
          ids: selecionadas.map(Number),
        }),
      });

      setSelecionadas([]);

      await carregarPecas();

      alert(resposta.mensagem || "Produtos enviados com sucesso!");
    } catch (erro) {
      setErro(erro.message || "Não foi possível enviar os produtos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Layout
      titulo="REPOSIÇÃO"
      pecas={pecas.filter((peca) => Number(peca.status) === 1)}
    >
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
          disabled={selecionadas.length === 0 || enviando}
        >
          {enviando
            ? "Enviando..."
            : selecionadas.length > 0
              ? `Enviar (${selecionadas.length})`
              : "Enviar"}
        </button>
      </div>

      {erro && (
        <p className="reposicao-error" role="alert">
          {erro}
        </p>
      )}

      <section className="reposicao-content" aria-label="Lista de peças">
        {carregando ? (
          <div className="reposicao-empty">
            <p>Carregando produtos...</p>
          </div>
        ) : pecasFiltradas.length > 0 ? (
          <div className="reposicao-grid">
            {pecasFiltradas.map((peca) => {
              const enviada = Number(peca.status) === 1;
              const idPeca = String(peca.id);
              const selecionada = selecionadas.includes(idPeca);

              return (
                <button
                  type="button"
                  key={peca.id}
                  className={`reposicao-piece ${
                    selecionada ? "selecionada" : ""
                  } ${enviada ? "ja-enviada" : ""}`}
                  title={peca.produto}
                  aria-label={peca.produto}
                  aria-pressed={selecionada}
                  data-selecionada={selecionada}
                  disabled={enviada || enviando}
                  onClick={() => alternarSelecao(peca)}
                >
                  {peca.imagem ? (
                    <img
                      className="reposicao-piece-image"
                      src={peca.imagem}
                      alt={peca.produto}
                    />
                  ) : (
                    <div className="reposicao-piece-image-vazia">IMG</div>
                  )}

                  <span className="reposicao-piece-name" title={peca.produto}>
                    {peca.produto}
                  </span>

                  <small className="reposicao-piece-brand">{peca.marca}</small>

                  {enviada && (
                    <span className="reposicao-piece-status">
                      Já enviada para reposição
                    </span>
                  )}

                  {selecionada && (
                    <span className="reposicao-piece-check">✓</span>
                  )}
                </button>
              );
            })}
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
