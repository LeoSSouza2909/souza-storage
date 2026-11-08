import React, { useEffect, useState } from "react";
import "./OrcamentosModal.css";
import { requisicaoApi, API_URL } from "../services/api";

export default function OrcamentosModal({ onClose }) {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [baixandoId, setBaixandoId] = useState(null);

  useEffect(() => {
    async function carregarPedidos() {
      try {
        setCarregando(true);
        setErro("");

        const resposta = await requisicaoApi("/api/pedidos");

        setPedidos(resposta.pedidos || []);
      } catch (erro) {
        setErro(erro.message || "Não foi possível carregar os orçamentos.");
      } finally {
        setCarregando(false);
      }
    }

    carregarPedidos();
  }, []);

  function obterUrlPdf(caminho) {
    if (!caminho) return "";

    // Se já for uma URL completa, utiliza diretamente.
    if (caminho.startsWith("http://") || caminho.startsWith("https://")) {
      return caminho;
    }

    // Compatibilidade com PDFs antigos armazenados no servidor.
    const baseUrl = API_URL.replace(/\/+$/, "");
    const caminhoPdf = caminho.startsWith("/") ? caminho : `/${caminho}`;

    return `${baseUrl}${caminhoPdf}`;
  }
  function formatarData(data) {
    if (!data) return "Data não disponível";

    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) {
      return "Data não disponível";
    }

    return dataConvertida.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function baixarPdf(pedido) {
    try {
      setBaixandoId(pedido.id);

      const resposta = await fetch(obterUrlPdf(pedido.arquivo_pdf));

      if (!resposta.ok) {
        throw new Error("Não foi possível baixar este orçamento.");
      }

      const arquivo = await resposta.blob();
      const urlTemporaria = URL.createObjectURL(arquivo);

      const link = document.createElement("a");
      link.href = urlTemporaria;
      link.download = `orcamento-${pedido.numero}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(urlTemporaria);
    } catch (erro) {
      alert(erro.message || "Erro ao baixar o PDF.");
    } finally {
      setBaixandoId(null);
    }
  }

  return (
    <div className="orcamentos-overlay" onClick={onClose}>
      <section
        className="orcamentos-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orcamentos-titulo"
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="orcamentos-cabecalho">
          <div>
            <h2 id="orcamentos-titulo">Orçamentos</h2>
            <p>Consulte os pedidos gerados anteriormente.</p>
          </div>

          <button
            type="button"
            className="orcamentos-fechar"
            onClick={onClose}
            aria-label="Fechar"
          >
            &times;
          </button>
        </header>

        <div className="orcamentos-conteudo">
          {carregando ? (
            <div className="orcamentos-mensagem">Carregando orçamentos...</div>
          ) : erro ? (
            <div className="orcamentos-mensagem orcamentos-erro">{erro}</div>
          ) : pedidos.length === 0 ? (
            <div className="orcamentos-vazio">
              <div className="orcamentos-icone-vazio">
                <svg
                  viewBox="0 0 24 24"
                  width="38"
                  height="38"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M8 13h8M8 17h8" />
                </svg>
              </div>

              <h3>Nenhum orçamento encontrado</h3>
              <p>
                Os pedidos gerados aparecerão aqui para você consultar e baixar
                novamente.
              </p>
            </div>
          ) : (
            <div className="orcamentos-lista">
              {pedidos.map((pedido) => (
                <article className="orcamento-item" key={pedido.id}>
                  <div className="orcamento-informacoes">
                    <div className="orcamento-icone">
                      <svg
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6M8 13h8M8 17h5" />
                      </svg>
                    </div>

                    <div className="orcamento-detalhes">
                      <h3>Orçamento nº {pedido.numero}</h3>
                      <span>{formatarData(pedido.data_criacao)}</span>
                    </div>
                  </div>

                  <div className="orcamento-acoes">
                    <a
                      href={obterUrlPdf(pedido.arquivo_pdf)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="orcamento-visualizar"
                    >
                      Visualizar PDF
                    </a>

                    <button
                      type="button"
                      className="orcamento-baixar"
                      onClick={() => baixarPdf(pedido)}
                      disabled={baixandoId === pedido.id}
                    >
                      {baixandoId === pedido.id
                        ? "Baixando..."
                        : "Baixar novamente"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="orcamentos-rodape">
          <span>
            {pedidos.length}{" "}
            {pedidos.length === 1
              ? "orçamento encontrado"
              : "orçamentos encontrados"}
          </span>

          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </section>
    </div>
  );
}
