require("dotenv").config();

const { google } = require("googleapis");
const http = require("http");
const { URL } = require("url");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3001/oauth2callback",
);

const urlAutorizacao = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.send"],
});

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:3001");

  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404);
    return res.end("Página não encontrada.");
  }

  const codigo = url.searchParams.get("code");

  if (!codigo) {
    res.writeHead(400);
    return res.end("Autorização não recebida.");
  }

  try {
    const { tokens } = await oauth2Client.getToken(codigo);

    console.log("\nAutorização concluída!");

    if (tokens.refresh_token) {
      console.log("\nSeu REFRESH TOKEN foi gerado.");
      console.log("Guarde-o em local seguro e não o compartilhe.");
    } else {
      console.log("\nNenhum refresh token foi retornado.");
      console.log("Será necessário revisar a autorização.");
    }

    require("fs").appendFileSync(
      ".env",
      `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token || ""}\n`,
    );

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h2>Gmail autorizado com sucesso! Pode fechar esta página.</h2>");
  } catch (erro) {
    console.error("Erro na autorização:", erro.message);
    res.writeHead(500);
    res.end("Não foi possível concluir a autorização.");
  } finally {
    servidor.close();
  }
});

servidor.listen(3001, () => {
  console.log("Aguardando autorização do Google...");
  console.log("\nAcesse este endereço:\n");
  console.log(urlAutorizacao);
});
