import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import "./Reposicao.css";
import { requisicaoApi } from "../services/api";

export default function Editar() {
  const [pecas, setPecas] = useState([]);

  const [pesquisa, setPesquisa] = useState("");
  const [modalAberta, setModalAberta] = useState(false);
  const [pecaEditando, setPecaEditando] = useState(null);
  const [importando, setImportando] = useState(false);
  const [nome, setNome] = useState("");
  const [marca, setMarca] = useState("");
  const [imagem, setImagem] = useState("");

  const [carregandoPecas, setCarregandoPecas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [erroFormulario, setErroFormulario] = useState("");
  const [modalImportacaoAberta, setModalImportacaoAberta] = useState(false);
  const [arquivoImportacao, setArquivoImportacao] = useState(null);
  const [erroImportacao, setErroImportacao] = useState("");

  // CONVERTER OS PRODUTOS DA API PARA O FORMATO DA TELA
  function formatarPecas(produtos) {
    return produtos.map((produto) => ({
      id: produto.id,
      nome: produto.produto,
      marca: produto.marca || "",
      imagem: produto.imagem || "",
      status: produto.status,
    }));
  }

  // CARREGAR PRODUTOS DO BANCO
  async function carregarPecas() {
    try {
      setErro("");

      const resposta = await requisicaoApi("/api/produtos");

      setPecas(formatarPecas(resposta.produtos || []));
    } catch (erro) {
      setErro(erro.message || "Não foi possível carregar os produtos.");
    } finally {
      setCarregandoPecas(false);
    }
  }

  useEffect(() => {
    carregarPecas();
  }, []);

  // FILTRAR PRODUTOS
  const pecasFiltradas = pecas.filter((peca) =>
    `${peca.nome} ${peca.marca}`
      .toLowerCase()
      .includes(pesquisa.trim().toLowerCase()),
  );

  // ABRIR MODAL
  function abrirModal(peca = null) {
    setPecaEditando(peca);

    setNome(peca?.nome || "");
    setMarca(peca?.marca || "");
    setImagem(peca?.imagem || "");

    setErroFormulario("");
    setModalAberta(true);
  }

  // FECHAR MODAL
  function fecharModal() {
    setModalAberta(false);
    setPecaEditando(null);

    setNome("");
    setMarca("");
    setImagem("");

    setErroFormulario("");
  }

  // ABRIR MODAL DE IMPORTAÇÃO
  function abrirModalImportacao() {
    setArquivoImportacao(null);
    setErroImportacao("");
    setModalImportacaoAberta(true);
  }

  // FECHAR MODAL DE IMPORTAÇÃO
  function fecharModalImportacao() {
    setModalImportacaoAberta(false);
    setArquivoImportacao(null);
    setErroImportacao("");
  }

  // SELECIONAR PLANILHA
  function selecionarArquivoImportacao(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    const extensao = arquivo.name.split(".").pop().toLowerCase();

    if (!["csv", "xlsx"].includes(extensao)) {
      setErroImportacao("Selecione um arquivo CSV ou Excel (.xlsx).");
      setArquivoImportacao(null);
      event.target.value = "";
      return;
    }

    setErroImportacao("");
    setArquivoImportacao(arquivo);
  }

  // REMOVER PLANILHA SELECIONADA
  function removerArquivoImportacao() {
    setArquivoImportacao(null);
    setErroImportacao("");

    const campoArquivo = document.getElementById("arquivo-importacao");

    if (campoArquivo) {
      campoArquivo.value = "";
    }
  }

  // IMPORTAR PRODUTOS POR CSV OU EXCEL
  async function importarProdutos() {
    if (!arquivoImportacao) {
      setErroImportacao("Selecione um arquivo primeiro.");
      return;
    }

    const dados = new FormData();

    dados.append("arquivo", arquivoImportacao);

    try {
      setImportando(true);
      setErroImportacao("");

      const resposta = await requisicaoApi("/api/produtos/importar", {
        method: "POST",
        body: dados,
      });

      // Atualizar a lista de produtos
      await carregarPecas();

      // Fechar a modal
      fecharModalImportacao();

      // Informar o resultado
      alert(
        resposta.mensagem ||
          `${resposta.total} produtos importados com sucesso!`,
      );
    } catch (erro) {
      setErroImportacao(
        erro.message || "Não foi possível importar os produtos.",
      );
    } finally {
      setImportando(false);
    }
  }

  // SELECIONAR IMAGEM
  function selecionarImagem(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setErroFormulario("Selecione um arquivo de imagem válido.");
      event.target.value = "";
      return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      setErroFormulario("A imagem deve possuir no máximo 5 MB.");
      event.target.value = "";
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      setImagem(leitor.result);
      setErroFormulario("");
    };

    leitor.onerror = () => {
      setErroFormulario("Não foi possível carregar a imagem.");
    };

    leitor.readAsDataURL(arquivo);
  }

  // CADASTRAR OU EDITAR PRODUTO
  async function salvarPeca(event) {
    event.preventDefault();

    setErroFormulario("");

    if (!nome.trim() || !marca.trim()) {
      setErroFormulario("Preencha o nome e a marca do produto.");
      return;
    }

    try {
      setSalvando(true);

      const dadosProduto = {
        produto: nome.trim(),
        marca: marca.trim(),
        imagem: imagem || null,
      };

      if (pecaEditando) {
        // EDITAR PRODUTO EXISTENTE
        await requisicaoApi(`/api/produtos/${pecaEditando.id}`, {
          method: "PUT",
          body: JSON.stringify(dadosProduto),
        });
      } else {
        // CADASTRAR NOVO PRODUTO
        await requisicaoApi("/api/produtos", {
          method: "POST",
          body: JSON.stringify(dadosProduto),
        });
      }

      // ATUALIZAR A LISTA COM OS DADOS DO BANCO
      const resposta = await requisicaoApi("/api/produtos");

      setPecas(formatarPecas(resposta.produtos || []));

      fecharModal();
    } catch (erro) {
      setErroFormulario(erro.message || "Não foi possível salvar o produto.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Layout titulo="EDITAR">
      <div className="reposicao-toolbar editar-toolbar">
        <label className="reposicao-search">
          <input
            type="search"
            placeholder="Pesquisar"
            value={pesquisa}
            onChange={(event) => setPesquisa(event.target.value)}
            aria-label="Pesquisar produtos"
          />

          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5 5" />
          </svg>
        </label>

        <div className="editar-toolbar-acoes">
          <button
            type="button"
            className="editar-importar-button"
            onClick={abrirModalImportacao}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 16V3" />
              <path d="m7 8 5-5 5 5" />
              <path d="M4 15v5h16v-5" />
            </svg>
            Importar
          </button>

          <button
            type="button"
            className="reposicao-send-button editar-add-button"
            onClick={() => abrirModal()}
          >
            <span className="editar-add-icon">+</span>
            Adicionar
          </button>
        </div>
      </div>

      <section className="reposicao-content" aria-label="Lista de produtos">
        {carregandoPecas ? (
          <div className="reposicao-empty">
            <p>Carregando produtos...</p>
          </div>
        ) : erro ? (
          <div className="reposicao-empty">
            <p>{erro}</p>

            <button type="button" onClick={carregarPecas}>
              Tentar novamente
            </button>
          </div>
        ) : pecasFiltradas.length > 0 ? (
          <div className="reposicao-grid">
            {pecasFiltradas.map((peca) => (
              <button
                type="button"
                className="reposicao-piece"
                key={peca.id}
                title={`${peca.nome} - ${peca.marca}`}
                aria-label={`Editar ${peca.nome}`}
                onClick={() => abrirModal(peca)}
              >
                {peca.imagem ? (
                  <img
                    className="reposicao-piece-image"
                    src={peca.imagem}
                    alt={peca.nome}
                  />
                ) : (
                  <div className="reposicao-piece-image-vazia">IMG</div>
                )}

                <span className="reposicao-piece-name" title={peca.nome}>
                  {peca.nome}
                </span>

                <small className="reposicao-piece-brand">{peca.marca}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="reposicao-empty">
            <p>
              {pesquisa.trim()
                ? "Nenhum produto encontrado."
                : "Nenhum produto cadastrado ainda."}
            </p>
          </div>
        )}
      </section>

      {modalAberta && (
        <div
          className="editar-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              fecharModal();
            }
          }}
        >
          <form className="editar-modal" onSubmit={salvarPeca}>
            <button
              type="button"
              className="editar-modal-fechar"
              onClick={fecharModal}
              aria-label="Fechar modal"
            >
              ×
            </button>

            <div className="editar-modal-campos">
              <input
                type="text"
                placeholder="Nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                aria-label="Nome do produto"
                maxLength={255}
                required
              />

              <input
                type="text"
                placeholder="Marca"
                value={marca}
                onChange={(event) => setMarca(event.target.value)}
                aria-label="Marca do produto"
                maxLength={150}
                required
              />
            </div>

            {erroFormulario && (
              <p className="editar-feedback" role="alert">
                {erroFormulario}
              </p>
            )}

            <div className="editar-modal-rodape">
              <div className="account-logo-section">
                <div className="account-logo-preview">
                  {imagem ? (
                    <img src={imagem} alt="Imagem do produto" />
                  ) : (
                    <svg viewBox="0 0 48 48" aria-hidden="true">
                      <rect x="7" y="7" width="34" height="34" rx="7" />
                      <path d="M16 34V19L24 14L32 19V34" />
                      <path d="M20 34V27H28V34" />
                    </svg>
                  )}
                </div>

                <div className="account-logo-info">
                  <strong>Imagem do produto</strong>
                  <span>PNG, JPG ou WEBP. Máximo de 5 MB.</span>

                  <label className="account-logo-button">
                    Escolher imagem
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={selecionarImagem}
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="editar-salvar-button"
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : pecaEditando
                    ? "Salvar"
                    : "Adicionar"}
              </button>
            </div>
          </form>
        </div>
      )}
      {modalImportacaoAberta && (
        <div
          className="importacao-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              fecharModalImportacao();
            }
          }}
        >
          <div className="importacao-modal">
            <button
              type="button"
              className="editar-modal-fechar"
              onClick={fecharModalImportacao}
              aria-label="Fechar modal"
            >
              ×
            </button>

            <div className="importacao-modal-header">
              <h2>Importar produtos</h2>
              <p>
                Importe vários produtos de uma só vez utilizando uma planilha.
              </p>
            </div>

            <div className="importacao-exemplo">
              <div className="importacao-exemplo-titulo">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 9v12M15 9v12" />
                </svg>

                <strong>Exemplo de organização do arquivo</strong>
              </div>

              <table className="importacao-tabela">
                <thead>
                  <tr>
                    <th>produto</th>
                    <th>marca</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>Parafuso Philips</td>
                    <td>Vonder</td>
                  </tr>

                  <tr>
                    <td>Furadeira</td>
                    <td>Bosch</td>
                  </tr>

                  <tr>
                    <td>Alicate Universal</td>
                    <td>Gedore</td>
                  </tr>
                </tbody>
              </table>

              <p className="importacao-observacao">
                A primeira linha deve conter a coluna obrigatória:
                <strong> produto</strong>. A coluna <strong>marca</strong> é
                opcional.
              </p>
            </div>

            <div className="importacao-arquivo">
              <div className="importacao-arquivo-titulo">
                <strong>Selecionar planilha</strong>
                <span>Formatos aceitos: CSV e Excel (.xlsx).</span>
              </div>

              <label
                className="importacao-seletor"
                htmlFor="arquivo-importacao"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 16V3" />
                  <path d="m7 8 5-5 5 5" />
                  <path d="M4 15v5h16v-5" />
                </svg>

                <strong>Escolher arquivo</strong>

                <input
                  id="arquivo-importacao"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={selecionarArquivoImportacao}
                />
              </label>

              {arquivoImportacao && (
                <div className="importacao-arquivo-selecionado">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M8 13h8M8 17h8" />
                  </svg>

                  <div>
                    <strong>{arquivoImportacao.name}</strong>
                    <span>{(arquivoImportacao.size / 1024).toFixed(1)} KB</span>
                  </div>

                  <button
                    type="button"
                    onClick={removerArquivoImportacao}
                    aria-label="Remover arquivo"
                  >
                    ×
                  </button>
                </div>
              )}

              {erroImportacao && (
                <p className="importacao-erro" role="alert">
                  {erroImportacao}
                </p>
              )}
            </div>

            <div className="importacao-modal-acoes">
              <button
                type="button"
                className="importacao-cancelar"
                onClick={fecharModalImportacao}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="importacao-confirmar"
                onClick={importarProdutos}
                disabled={!arquivoImportacao || importando}
              >
                {importando ? "Importando..." : "Importar produtos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
