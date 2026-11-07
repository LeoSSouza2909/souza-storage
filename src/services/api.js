export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function requisicaoApi(endpoint, opcoes = {}) {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const headers = {
    ...opcoes.headers,
  };

  if (opcoes.body && !(opcoes.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resposta = await fetch(`${API_URL}${endpoint}`, {
    ...opcoes,
    headers,
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(dados.mensagem || "Erro ao comunicar com o servidor.");
  }

  return dados;
}
