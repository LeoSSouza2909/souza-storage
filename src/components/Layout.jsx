import React, { useState } from "react";
import "./Layout.css";
import logo from "../assets/logo.png";
import PedidoModal from "./PedidoModal";

export default function Layout({ titulo, children, pecas = [] }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [pedidoModalAberta, setPedidoModalAberta] = useState(false);

  function selecionarOpcao(opcao) {
    setMenuAberto(false);

    if (opcao === "Repor") {
      window.location.href = "/reposicao";
    } else if (opcao === "Editar") {
      window.location.href = "/editar";
    } else if (opcao === "Criar pedido") {
      setPedidoModalAberta(true);
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

        <button
          type="button"
          className="layout-icon-button notification-button"
          aria-label="Notificações"
          aria-expanded={notificacoesAbertas}
          onClick={() => setNotificacoesAbertas((aberto) => !aberto)}
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M6 23 H26 L23 19 V12 A7 7 0 0 0 9 12 V19 Z" />
            <path d="M13 26 Q16 30 19 26" />
          </svg>
        </button>
      </header>

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
        </nav>
      )}

      {notificacoesAbertas && (
        <div className="layout-notifications">
          Nenhuma notificação no momento.
        </div>
      )}

      <section className="layout-content">
        <div className="layout-watermark" aria-hidden="true">
          <img src={logo} alt="" />
        </div>

        <div className="layout-page-content">{children}</div>
      </section>

      {pedidoModalAberta && (
        <PedidoModal
          pecas={pecas}
          onClose={() => setPedidoModalAberta(false)}
        />
      )}
    </main>
  );
}
