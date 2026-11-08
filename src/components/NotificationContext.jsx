import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import "./NotificationContext.css";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notificacao, setNotificacao] = useState(null);

  const notificar = useCallback((tipo, mensagem) => {
    setNotificacao({
      id: Date.now(),
      tipo,
      mensagem,
    });
  }, []);

  const fecharNotificacao = useCallback(() => {
    setNotificacao(null);
  }, []);

  useEffect(() => {
    if (!notificacao) return;

    const temporizador = setTimeout(() => {
      setNotificacao(null);
    }, 4000);

    return () => clearTimeout(temporizador);
  }, [notificacao]);

  return (
    <NotificationContext.Provider value={{ notificar }}>
      {children}

      {notificacao && (
        <div
          key={notificacao.id}
          className={`notificacao notificacao-${notificacao.tipo}`}
          role="status"
          aria-live="polite"
        >
          <span className="notificacao-icone">
            {notificacao.tipo === "sucesso" ? "✓" : "!"}
          </span>

          <span className="notificacao-mensagem">{notificacao.mensagem}</span>

          <button
            type="button"
            className="notificacao-fechar"
            onClick={fecharNotificacao}
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const contexto = useContext(NotificationContext);

  if (!contexto) {
    throw new Error(
      "useNotification deve ser utilizado dentro de NotificationProvider.",
    );
  }

  return contexto;
}
