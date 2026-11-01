import React, { useState } from "react";
import Layout from "../components/Layout";
import "./Reposicao.css";

const pecasTeste = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  nome: `Peça de teste ${index + 1}`,
  codigo: String(index + 1).padStart(4, "0"),
  imagem: "",
}));

export default function Editar({ pecasCadastradas }) {
  const [pecas, setPecas] = useState(() => pecasCadastradas ?? pecasTeste);

  const [pesquisa, setPesquisa] = useState("");
  const [modalAberta, setModalAberta] = useState(false);
  const [pecaEditando, setPecaEditando] = useState(null);

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [imagem, setImagem] = useState("");

  const pecasFiltradas = pecas.filter((peca) =>
    `${peca.nome} ${peca.codigo || ""}`
      .toLowerCase()
      .includes(pesquisa.trim().toLowerCase()),
  );

  function abrirModal(peca = null) {
    setPecaEditando(peca);
    setNome(peca?.nome || "");
    setCodigo(peca?.codigo || "");
    setImagem(peca?.imagem || "");
    setModalAberta(true);
  }

  function fecharModal() {
    setModalAberta(false);
    setPecaEditando(null);
    setNome("");
    setCodigo("");
    setImagem("");
  }

  function selecionarImagem(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.");
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      setImagem(leitor.result);
    };

    leitor.readAsDataURL(arquivo);
  }

  function salvarPeca(event) {
    event.preventDefault();

    if (!nome.trim() || !codigo.trim()) {
      alert("Preencha o nome e o código da peça.");
      return;
    }

    if (pecaEditando) {
      setPecas((listaAtual) =>
        listaAtual.map((peca) =>
          peca.id === pecaEditando.id
            ? { ...peca, nome: nome.trim(), codigo: codigo.trim(), imagem }
            : peca,
        ),
      );
    } else {
      const novaPeca = {
        id: Date.now(),
        nome: nome.trim(),
        codigo: codigo.trim(),
        imagem,
      };

      setPecas((listaAtual) => [...listaAtual, novaPeca]);
    }

    fecharModal();
  }

  return (
    <Layout titulo="EDITAR">
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
          className="reposicao-send-button editar-add-button"
          onClick={() => abrirModal()}
        >
          <span className="editar-add-icon">+</span>
          Adicionar
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
                aria-label={`Editar ${peca.nome}`}
                onClick={() => abrirModal(peca)}
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
                aria-label="Nome da peça"
              />

              <input
                type="text"
                placeholder="Código"
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                aria-label="Código da peça"
              />
            </div>

            <div className="editar-modal-rodape">
              <label className="editar-imagem-seletor">
                {imagem ? (
                  <img src={imagem} alt="Prévia da peça" />
                ) : (
                  <>
                    <span className="editar-imagem-mais">+</span>
                    <span>IMG</span>
                  </>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={selecionarImagem}
                  hidden
                />
              </label>

              <button type="submit" className="editar-salvar-button">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
