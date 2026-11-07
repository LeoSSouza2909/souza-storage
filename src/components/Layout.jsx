import React, { useEffect, useState } from "react";
import "./Layout.css";
import logo from "../assets/logo.png";
import PedidoModal from "./PedidoModal";
import { useNavigate } from "react-router-dom";
import { requisicaoApi, API_URL } from "../services/api";
import OrcamentosModal from "./OrcamentosModal";

export default function Layout({ titulo, children, pecas = [] }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [pedidoModalAberta, setPedidoModalAberta] = useState(false);

  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);
  const [erroNotificacoes, setErroNotificacoes] = useState("");
  const [menuContaAberto, setMenuContaAberto] = useState(false);
  const [modalContaAberta, setModalContaAberta] = useState(false);
  const [orcamentosModalAberta, setOrcamentosModalAberta] = useState(false);

  const [conta, setConta] = useState({
    nome: "",
    cnpj: "",
    email: "",
    logo: null,
  });

  const [logoArquivo, setLogoArquivo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [carregandoConta, setCarregandoConta] = useState(false);
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [mensagemConta, setMensagemConta] = useState("");
  const [erroConta, setErroConta] = useState("");

  const navigate = useNavigate();

  async function abrirInformacoesConta() {
    setMenuContaAberto(false);
    setModalContaAberta(true);
    setCarregandoConta(true);
    setErroConta("");
    setMensagemConta("");
    setLogoArquivo(null);

    try {
      const dados = await requisicaoApi("/api/conta");
      const usuario = dados.usuario;

      setConta({
        nome: usuario.nome || "",
        cnpj: usuario.cnpj || "",
        email: usuario.email || "",
        logo: usuario.logo || null,
      });

      setLogoPreview(usuario.logo ? `${API_URL}${usuario.logo}` : "");
    } catch (erro) {
      setErroConta(erro.message);
    } finally {
      setCarregandoConta(false);
    }
  }

  function formatarCNPJ(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 14);

    return numeros
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  function selecionarLogo(event) {
    const arquivo = event.target.files[0];

    if (!arquivo) return;

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

    if (!tiposPermitidos.includes(arquivo.type)) {
      setErroConta("Selecione uma imagem PNG, JPG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (arquivo.size > 2 * 1024 * 1024) {
      setErroConta("A imagem deve ter no máximo 2 MB.");
      event.target.value = "";
      return;
    }

    setErroConta("");
    setMensagemConta("");
    setLogoArquivo(arquivo);
    setLogoPreview(URL.createObjectURL(arquivo));
  }

  async function salvarInformacoesConta(event) {
    event.preventDefault();

    setSalvandoConta(true);
    setErroConta("");
    setMensagemConta("");

    try {
      const formulario = new FormData();

      formulario.append("nome", conta.nome);
      formulario.append("cnpj", conta.cnpj.replace(/\D/g, ""));
      formulario.append("email", conta.email);

      if (logoArquivo) {
        formulario.append("logo", logoArquivo);
      }

      const dados = await requisicaoApi("/api/conta", {
        method: "PUT",
        body: formulario,
      });

      const usuario = dados.usuario;

      setConta({
        nome: usuario.nome,
        cnpj: usuario.cnpj,
        email: usuario.email,
        logo: usuario.logo,
      });

      setLogoArquivo(null);

      setLogoPreview(usuario.logo ? `${API_URL}${usuario.logo}` : "");

      setMensagemConta(dados.mensagem);
    } catch (erro) {
      setErroConta(erro.message);
    } finally {
      setSalvandoConta(false);
    }
  }

  async function carregarNotificacoes() {
    try {
      setCarregandoNotificacoes(true);
      setErroNotificacoes("");

      const dados = await requisicaoApi("/api/notificacoes");

      const lista = dados.notificacoes || [];

      setNotificacoes(lista);
      setNaoLidas(
        lista.filter((notificacao) => Number(notificacao.lida) === 0).length,
      );
    } catch (erro) {
      console.error("Erro ao carregar notificações:", erro);
      setErroNotificacoes(erro.message);
    } finally {
      setCarregandoNotificacoes(false);
    }
  }

  useEffect(() => {
    // Carrega as notificações ao abrir a página.
    carregarNotificacoes();

    // Atualiza automaticamente a cada 10 segundos.
    const intervaloNotificacoes = setInterval(() => {
      if (document.visibilityState === "visible") {
        carregarNotificacoes();
      }
    }, 5000);

    // Atualiza imediatamente quando o usuário volta para a página.
    function atualizarAoVoltar() {
      if (document.visibilityState === "visible") {
        carregarNotificacoes();
      }
    }

    document.addEventListener("visibilitychange", atualizarAoVoltar);

    // Limpa o intervalo ao sair da página.
    return () => {
      clearInterval(intervaloNotificacoes);

      document.removeEventListener("visibilitychange", atualizarAoVoltar);
    };
  }, []);
  async function alternarNotificacoes() {
    const abrir = !notificacoesAbertas;

    setNotificacoesAbertas(abrir);

    if (abrir) {
      await carregarNotificacoes();
    }
  }

  async function marcarComoLida(id) {
    try {
      await requisicaoApi(`/api/notificacoes/${id}/lida`, {
        method: "PATCH",
      });

      setNotificacoes((anteriores) =>
        anteriores.map((notificacao) =>
          notificacao.id === id ? { ...notificacao, lida: 1 } : notificacao,
        ),
      );

      setNaoLidas((anterior) => Math.max(0, anterior - 1));
    } catch (erro) {
      console.error("Erro ao marcar notificação como lida:", erro);
      setErroNotificacoes(erro.message);
    }
  }

  async function marcarTodasComoLidas() {
    try {
      await requisicaoApi("/api/notificacoes/lidas", {
        method: "PATCH",
      });

      setNotificacoes((anteriores) =>
        anteriores.map((notificacao) => ({
          ...notificacao,
          lida: 1,
        })),
      );

      setNaoLidas(0);
    } catch (erro) {
      console.error("Erro ao marcar notificações:", erro);
      setErroNotificacoes(erro.message);
    }
  }

  function formatarData(data) {
    if (!data) return "";

    const dataFormatada = new Date(data);

    if (Number.isNaN(dataFormatada.getTime())) return "";

    return dataFormatada.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function sairDaConta() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");

    window.dispatchEvent(new Event("souza-storage-logout"));

    setMenuAberto(false);
    setPedidoModalAberta(false);
    setMenuContaAberto(false);
    setModalContaAberta(false);

    navigate("/", { replace: true });
  }

  function selecionarOpcao(opcao) {
    setMenuAberto(false);

    if (opcao === "Repor") {
      window.location.href = "/reposicao";
    } else if (opcao === "Editar") {
      window.location.href = "/editar";
    } else if (opcao === "Criar pedido") {
      setPedidoModalAberta(true);
    } else if (opcao === "Orçamentos") {
      setOrcamentosModalAberta(true);
    }
  }

  return (
    <main className="layout-page">
      <header className="layout-header">
        <button
          type="button"
          className={`layout-icon-button menu-button ${
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

        <h1>{titulo}</h1>

        <div className="layout-header-actions">
          <button
            type="button"
            className="layout-icon-button notification-button"
            aria-label={`Notificações: ${naoLidas} não lidas`}
            aria-expanded={notificacoesAbertas}
            onClick={() => {
              setMenuAberto(false);
              setMenuContaAberto(false);
              alternarNotificacoes();
            }}
          >
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M6 23 H26 L23 19 V12 A7 7 0 0 0 9 12 V19 Z" />
              <path d="M13 26 Q16 30 19 26" />
            </svg>

            {naoLidas > 0 && (
              <span className="notification-badge">
                {naoLidas > 99 ? "99+" : naoLidas}
              </span>
            )}
          </button>

          <button
            type="button"
            className="layout-icon-button account-button"
            aria-label="Conta"
            aria-expanded={menuContaAberto}
            onClick={() => {
              setMenuAberto(false);
              setNotificacoesAbertas(false);
              setMenuContaAberto((aberto) => !aberto);
            }}
          >
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="10" r="6" />
              <path d="M4 28 C4 20 9 17 16 17 C23 17 28 20 28 28" />
            </svg>
          </button>
        </div>
      </header>

      {menuContaAberto && (
        <nav className="account-menu" aria-label="Menu da conta">
          <button type="button" onClick={abrirInformacoesConta}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21 C4 16 7 13 12 13 C17 13 20 16 20 21" />
            </svg>
            <span>Informações da conta</span>
          </button>

          <button
            type="button"
            className="account-logout"
            onClick={sairDaConta}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 17L15 12L10 7" />
              <path d="M15 12H3" />
              <path d="M12 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H12" />
            </svg>
            <span>Sair da conta</span>
          </button>
        </nav>
      )}

      {menuAberto && (
        <nav className="layout-menu" aria-label="Menu principal">
          <button type="button" onClick={() => selecionarOpcao("Repor")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3 21 8 12 13 3 8 12 3Z" />
              <path d="M3 8V17L12 22L21 17V8" />
              <path d="M12 13V22" />
            </svg>
            <span>Repor</span>
          </button>

          <button type="button" onClick={() => selecionarOpcao("Editar")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20H21" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
            </svg>
            <span>Editar</span>
          </button>

          <button type="button" onClick={() => selecionarOpcao("Criar pedido")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4Z" />
            </svg>
            <span>Criar pedido</span>
          </button>

          <button type="button" onClick={() => selecionarOpcao("Orçamentos")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8" />
              <path d="M8 17h5" />
            </svg>
            <span>Orçamentos</span>
          </button>
        </nav>
      )}

      {notificacoesAbertas && (
        <div className="layout-notifications">
          <div className="notifications-header">
            <div>
              <h2>Notificações</h2>
              <span>
                {naoLidas} {naoLidas === 1 ? "não lida" : "não lidas"}
              </span>
            </div>

            {naoLidas > 0 && (
              <button
                type="button"
                className="notifications-read-all"
                onClick={marcarTodasComoLidas}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {erroNotificacoes && (
            <p className="notifications-error">{erroNotificacoes}</p>
          )}

          {carregandoNotificacoes ? (
            <p className="notifications-empty">Carregando notificações...</p>
          ) : notificacoes.length === 0 ? (
            <p className="notifications-empty">
              Nenhuma notificação no momento.
            </p>
          ) : (
            <div className="notifications-list">
              {notificacoes.map((notificacao) => {
                const lida = Number(notificacao.lida) === 1;

                return (
                  <button
                    type="button"
                    key={notificacao.id}
                    className={`notification-item ${
                      lida ? "notification-read" : "notification-unread"
                    }`}
                    onClick={() => {
                      if (!lida) marcarComoLida(notificacao.id);
                    }}
                  >
                    <span className="notification-indicator" />

                    <span className="notification-item-content">
                      <strong>{notificacao.titulo}</strong>
                      <span>{notificacao.mensagem}</span>
                      <small>{formatarData(notificacao.criado_em)}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <section className="layout-content">
        <div className="layout-watermark" aria-hidden="true">
          <img src={logo} alt="" />
        </div>

        <div className="layout-page-content">{children}</div>
      </section>

      {orcamentosModalAberta && (
        <OrcamentosModal onClose={() => setOrcamentosModalAberta(false)} />
      )}

      {pedidoModalAberta && (
        <PedidoModal
          pecas={pecas}
          onClose={() => setPedidoModalAberta(false)}
        />
      )}

      {modalContaAberta && (
        <div
          className="account-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalContaAberta(false);
            }
          }}
        >
          <section
            className="account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
          >
            <div className="account-modal-header">
              <div>
                <h2 id="account-modal-title">Informações da conta</h2>
                <p>Gerencie os dados da sua empresa.</p>
              </div>

              <button
                type="button"
                className="account-modal-close"
                aria-label="Fechar"
                onClick={() => setModalContaAberta(false)}
              >
                ×
              </button>
            </div>

            {carregandoConta ? (
              <p className="account-loading">Carregando informações...</p>
            ) : (
              <form className="account-form" onSubmit={salvarInformacoesConta}>
                <div className="account-logo-section">
                  <div className="account-logo-preview">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo da empresa" />
                    ) : (
                      <svg viewBox="0 0 48 48" aria-hidden="true">
                        <rect x="7" y="7" width="34" height="34" rx="7" />
                        <path d="M16 34V19L24 14L32 19V34" />
                        <path d="M20 34V27H28V34" />
                      </svg>
                    )}
                  </div>

                  <div className="account-logo-info">
                    <strong>Logo da empresa</strong>
                    <span>PNG, JPG ou WEBP. Máximo de 2 MB.</span>

                    <label className="account-logo-button">
                      Escolher imagem
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={selecionarLogo}
                      />
                    </label>
                  </div>
                </div>

                <div className="account-field">
                  <label htmlFor="account-name">Nome da empresa</label>
                  <input
                    id="account-name"
                    type="text"
                    maxLength={150}
                    value={conta.nome}
                    onChange={(event) =>
                      setConta({ ...conta, nome: event.target.value })
                    }
                    required
                  />
                </div>

                <div className="account-field">
                  <label htmlFor="account-cnpj">CNPJ</label>
                  <input
                    id="account-cnpj"
                    type="text"
                    value={formatarCNPJ(conta.cnpj)}
                    onChange={(event) =>
                      setConta({
                        ...conta,
                        cnpj: event.target.value.replace(/\D/g, ""),
                      })
                    }
                    maxLength={18}
                    required
                  />
                </div>

                <div className="account-field">
                  <label htmlFor="account-email">E-mail</label>
                  <input
                    id="account-email"
                    type="email"
                    maxLength={150}
                    value={conta.email}
                    onChange={(event) =>
                      setConta({ ...conta, email: event.target.value })
                    }
                    required
                  />
                </div>

                {erroConta && (
                  <p className="account-message account-error">{erroConta}</p>
                )}

                {mensagemConta && (
                  <p className="account-message account-success">
                    {mensagemConta}
                  </p>
                )}

                <div className="account-modal-actions">
                  <button
                    type="button"
                    className="account-cancel-button"
                    onClick={() => setModalContaAberta(false)}
                  >
                    Fechar
                  </button>

                  <button
                    type="submit"
                    className="account-save-button"
                    disabled={salvandoConta}
                  >
                    {salvandoConta ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
