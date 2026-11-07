const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const autenticar = require("./middleware/autenticar");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const ExcelJS = require("exceljs");
const { Readable } = require("stream");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/arquivos", express.static(path.join(__dirname, "arquivos")));

// CONFIGURAÇÃO DO UPLOAD DA LOGO DA EMPRESA

const armazenamentoLogo = multer.diskStorage({
  destination: (req, file, callback) => {
    const pasta = path.join(__dirname, "arquivos", "logos");

    fs.mkdir(pasta, { recursive: true }, (erro) => {
      callback(erro, pasta);
    });
  },

  filename: (req, file, callback) => {
    const extensoes = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };

    const extensao = extensoes[file.mimetype];

    callback(
      null,
      `logo-${req.usuarioId}-${crypto.randomBytes(8).toString("hex")}${extensao}`,
    );
  },
});

const uploadLogo = multer({
  storage: armazenamentoLogo,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

    if (!tiposPermitidos.includes(file.mimetype)) {
      return callback(new Error("Envie uma imagem PNG, JPG ou WEBP."));
    }

    callback(null, true);
  },
});

// CONFIGURAÇÃO DO UPLOAD DE ARQUIVOS PARA IMPORTAÇÃO

const uploadImportacao = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter: (req, file, callback) => {
    const extensao = path.extname(file.originalname).toLowerCase();

    if (![".csv", ".xlsx"].includes(extensao)) {
      return callback(new Error("Envie um arquivo CSV ou Excel (.xlsx)."));
    }

    callback(null, true);
  },
});

// Conexão com o MySQL
const conexao = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Configuração do Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Rota inicial
app.get("/", (req, res) => {
  res.json({
    mensagem: "API do Souza Storage funcionando!",
  });
});

// Testar conexão com o banco
app.get("/api/teste-banco", async (req, res) => {
  try {
    const [resultado] = await conexao.query("SELECT DATABASE() AS banco");

    res.json({
      conectado: true,
      mensagem: "Conexão com MySQL realizada com sucesso!",
      banco: resultado[0].banco,
    });
  } catch (erro) {
    console.error("Erro ao conectar ao MySQL:", erro.message);

    res.status(500).json({
      conectado: false,
      mensagem: "Não foi possível conectar ao banco de dados.",
    });
  }
});

async function gerarPdfPedido(caminho, numeroPedido, produtos, empresa) {
  await fs.promises.mkdir(path.dirname(caminho), {
    recursive: true,
  });

  return new Promise((resolve, reject) => {
    const documento = new PDFDocument({
      size: "A4",
      margins: {
        top: 55,
        bottom: 55,
        left: 50,
        right: 50,
      },
    });

    const arquivo = fs.createWriteStream(caminho);

    documento.pipe(arquivo);

    arquivo.on("finish", resolve);
    arquivo.on("error", reject);
    documento.on("error", reject);

    const logoOriginal = path.join(
      __dirname,
      "arquivos",
      "logo-souza-storage.png",
    );

    // Localizar a logo cadastrada pela empresa.
    const caminhoLogoEmpresa = empresa.logo
      ? path.join(__dirname, empresa.logo.replace(/^\/+/, ""))
      : null;

    const extensaoLogo = caminhoLogoEmpresa
      ? path.extname(caminhoLogoEmpresa).toLowerCase()
      : "";

    const logoEmpresaValida =
      caminhoLogoEmpresa &&
      fs.existsSync(caminhoLogoEmpresa) &&
      [".png", ".jpg", ".jpeg"].includes(extensaoLogo);

    documento.font("Helvetica");

    // CABEÇALHO: logo da empresa ou nome da empresa.
    if (logoEmpresaValida) {
      documento.image(caminhoLogoEmpresa, 210, 40, {
        fit: [175, 65],
        align: "center",
        valign: "center",
      });
    } else {
      documento
        .font("Helvetica-Bold")
        .fontSize(21)
        .fillColor("#0865f9")
        .text(empresa.nome, 50, 55, {
          width: 495,
          align: "center",
        });
    }

    documento.y = 125;

    documento
      .font("Helvetica-Bold")
      .fontSize(17)
      .fillColor("#222222")
      .text("PEDIDO DE ORÇAMENTO", {
        align: "center",
      });

    documento.moveDown();

    documento
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#555555")
      .text(`Número do pedido: ${numeroPedido}`);

    documento.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`);

    documento.moveDown();

    documento
      .moveTo(50, documento.y)
      .lineTo(545, documento.y)
      .strokeColor("#0865f9")
      .stroke();

    documento.moveDown();

    // Título solicitado.
    documento
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#222222")
      .text("Descrição");

    documento.moveDown();

    produtos.forEach((produto, indice) => {
      if (documento.y > 720) {
        documento.addPage();
      }

      documento
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#222222")
        .text(`${indice + 1}. ${produto.produto}`);

      documento
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#666666")
        .text(`Marca: ${produto.marca || "Não informada"}`);

      documento.moveDown(0.8);
    });

    documento.moveDown(2);

    // RODAPÉ: identificação do sistema e sua logo original.
    documento
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#888888")
      .text("Documento gerado por:", {
        align: "center",
      });

    if (fs.existsSync(logoOriginal)) {
      documento.moveDown(0.5);

      documento.image(logoOriginal, 247, documento.y, {
        fit: [100, 45],
        align: "center",
        valign: "center",
      });
    }

    documento.end();
  });
}

// INICIAR CADASTRO E ENVIAR CÓDIGO
app.post("/api/auth/cadastro", async (req, res) => {
  try {
    const { nome, email, cnpj, senha } = req.body;

    if (!nome || !email || !cnpj || !senha) {
      return res.status(400).json({
        mensagem: "Preencha todos os campos.",
      });
    }

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();
    const cnpjLimpo = cnpj.replace(/[./\-\s]/g, "");

    if (!nomeLimpo || !emailLimpo.includes("@")) {
      return res.status(400).json({
        mensagem: "Informe um nome e um e-mail válidos.",
      });
    }

    if (cnpjLimpo.length !== 14) {
      return res.status(400).json({
        mensagem: "O CNPJ deve conter 14 caracteres.",
      });
    }

    if (senha.length < 8) {
      return res.status(400).json({
        mensagem: "A senha deve possuir pelo menos 8 caracteres.",
      });
    }

    // Verificar se e-mail ou CNPJ já estão cadastrados
    const [usuarios] = await conexao.execute(
      `SELECT id FROM usuario
       WHERE email = ? OR cnpj = ?`,
      [emailLimpo, cnpjLimpo],
    );

    if (usuarios.length > 0) {
      return res.status(409).json({
        mensagem: "Este e-mail ou CNPJ já está cadastrado.",
      });
    }

    // Gerar código de quatro números
    const codigo = crypto.randomInt(0, 10000).toString().padStart(4, "0");

    const senhaHash = await bcrypt.hash(senha, 12);
    const codigoHash = await bcrypt.hash(codigo, 10);

    // Enviar código pelo Gmail
    await transporter.sendMail({
      from: `"Souza Storage" <${process.env.EMAIL_USER}>`,
      to: emailLimpo,
      subject: "Confirmação de cadastro - Souza Storage",
      text: `Seu código de confirmação é: ${codigo}. Ele expira em 10 minutos.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 25px;">
          <h2 style="color: #0865f9;">Souza Storage</h2>
          <p>Olá, ${nomeLimpo}!</p>
          <p>Use o código abaixo para confirmar seu cadastro:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 10px; padding: 20px; background: #f1f1f1; text-align: center;">
            ${codigo}
          </div>
          <p>Este código é válido por 10 minutos.</p>
          <p>Se você não solicitou este cadastro, ignore esta mensagem.</p>
        </div>
      `,
    });

    // Salvar ou atualizar cadastro pendente
    await conexao.execute(
      `INSERT INTO cadastro_pendente
       (nome, email, cnpj, senha, codigo_hash, expira_em, tentativas)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0)
       ON DUPLICATE KEY UPDATE
       nome = VALUES(nome),
       cnpj = VALUES(cnpj),
       senha = VALUES(senha),
       codigo_hash = VALUES(codigo_hash),
       expira_em = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
       tentativas = 0`,
      [nomeLimpo, emailLimpo, cnpjLimpo, senhaHash, codigoHash],
    );

    return res.status(200).json({
      mensagem: "Código de confirmação enviado para seu e-mail.",
      email: emailLimpo,
    });
  } catch (erro) {
    console.error("Erro ao iniciar cadastro:", erro);

    return res.status(500).json({
      mensagem:
        "Não foi possível enviar o código. Verifique o e-mail e tente novamente.",
    });
  }
});

app.post("/api/pedidos", autenticar, async (req, res) => {
  const { ids } = req.body;

  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 200 ||
    !ids.every((id) => Number.isInteger(Number(id)) && Number(id) > 0)
  ) {
    return res.status(400).json({
      mensagem: "Selecione pelo menos uma peça válida.",
    });
  }

  const idsUnicos = [...new Set(ids.map(Number))];

  if (idsUnicos.length !== ids.length) {
    return res.status(400).json({
      mensagem: "Existem peças repetidas na seleção.",
    });
  }

  let conexaoPedido;
  let caminhoPdf;
  let transacaoIniciada = false;

  try {
    conexaoPedido = await conexao.getConnection();

    await conexaoPedido.beginTransaction();
    transacaoIniciada = true;

    // Buscar os dados da empresa e bloquear sua linha
    // para evitar que dois pedidos recebam o mesmo número.
    const [empresas] = await conexaoPedido.execute(
      `SELECT id, nome, logo
       FROM usuario
       WHERE id = ?
       FOR UPDATE`,
      [req.usuarioId],
    );

    if (empresas.length === 0) {
      throw new Error("Empresa não encontrada.");
    }

    const empresa = empresas[0];

    // Descobrir o próximo número de pedido desta empresa.
    const [numeros] = await conexaoPedido.execute(
      `SELECT COALESCE(MAX(CAST(numero AS UNSIGNED)), 0) + 1 AS proximo
       FROM pedidos
       WHERE usuario_id = ?`,
      [req.usuarioId],
    );

    const numeroPedido = String(numeros[0].proximo);

    const placeholders = idsUnicos.map(() => "?").join(",");

    const [produtos] = await conexaoPedido.execute(
      `SELECT id, produto, marca
       FROM produtos
       WHERE usuario_id = ?
       AND status = 1
       AND id IN (${placeholders})
       FOR UPDATE`,
      [req.usuarioId, ...idsUnicos],
    );

    if (produtos.length !== idsUnicos.length) {
      throw new Error("Uma ou mais peças não estão disponíveis para pedido.");
    }

    const nomeArquivo = `pedido-${req.usuarioId}-${Date.now()}.pdf`;

    caminhoPdf = path.join(__dirname, "arquivos", "pedidos", nomeArquivo);

    // Gerar o PDF com os dados da empresa.
    await gerarPdfPedido(caminhoPdf, numeroPedido, produtos, empresa);

    const arquivoRelativo = `/arquivos/pedidos/${nomeArquivo}`;

    const [pedido] = await conexaoPedido.execute(
      `INSERT INTO pedidos
       (usuario_id, numero, arquivo_pdf)
       VALUES (?, ?, ?)`,
      [req.usuarioId, numeroPedido, arquivoRelativo],
    );

    for (const produto of produtos) {
      await conexaoPedido.execute(
        `INSERT INTO pedido_produtos
         (pedido_id, produto_id, nome_produto, marca)
         VALUES (?, ?, ?, ?)`,
        [pedido.insertId, produto.id, produto.produto, produto.marca],
      );
    }

    // Somente os produtos selecionados voltam ao status 0.
    const [atualizacao] = await conexaoPedido.execute(
      `UPDATE produtos
       SET status = 0
       WHERE usuario_id = ?
       AND status = 1
       AND id IN (${placeholders})`,
      [req.usuarioId, ...idsUnicos],
    );

    if (atualizacao.affectedRows !== idsUnicos.length) {
      throw new Error("Não foi possível atualizar o status de todas as peças.");
    }

    await conexaoPedido.commit();
    transacaoIniciada = false;

    return res.status(201).json({
      mensagem: "Pedido criado com sucesso!",
      numero: numeroPedido,
      url: `${req.protocol}://${req.get("host")}${arquivoRelativo}`,
    });
  } catch (erro) {
    if (transacaoIniciada && conexaoPedido) {
      await conexaoPedido.rollback();
    }

    if (caminhoPdf) {
      await fs.promises.unlink(caminhoPdf).catch(() => {});
    }

    console.error("Erro ao criar pedido:", erro);

    return res.status(500).json({
      mensagem: erro.message || "Erro ao gerar o pedido.",
    });
  } finally {
    if (conexaoPedido) {
      conexaoPedido.release();
    }
  }
});

// Listar os orçamentos já gerados pela empresa
app.get("/api/pedidos", autenticar, async (req, res) => {
  try {
    const [pedidos] = await conexao.execute(
      `SELECT id, numero, data_criacao, arquivo_pdf
       FROM pedidos
       WHERE usuario_id = ?
       ORDER BY data_criacao DESC, id DESC`,
      [req.usuarioId],
    );

    return res.json({ pedidos });
  } catch (erro) {
    console.error("Erro ao listar orçamentos:", erro);

    return res.status(500).json({
      mensagem: "Erro ao buscar os orçamentos.",
    });
  }
});

// REENVIAR CÓDIGO DE CONFIRMAÇÃO
app.post("/api/auth/cadastro/reenviar", async (req, res) => {
  try {
    const emailLimpo = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!emailLimpo) {
      return res.status(400).json({
        mensagem: "Informe o e-mail do cadastro.",
      });
    }

    // Verificar se existe um cadastro pendente
    const [cadastros] = await conexao.execute(
      `SELECT id,
              (ultimo_reenvio_em IS NOT NULL
               AND ultimo_reenvio_em > DATE_SUB(NOW(), INTERVAL 60 SECOND))
               AS aguardando
       FROM cadastro_pendente
       WHERE email = ?`,
      [emailLimpo],
    );

    if (cadastros.length === 0) {
      return res.status(404).json({
        mensagem:
          "Cadastro pendente não encontrado. Faça o cadastro novamente.",
      });
    }

    if (cadastros[0].aguardando) {
      return res.status(429).json({
        mensagem: "Aguarde 60 segundos antes de solicitar outro código.",
      });
    }

    // Gerar um novo código
    const codigo = crypto.randomInt(0, 10000).toString().padStart(4, "0");
    const codigoHash = await bcrypt.hash(codigo, 10);

    // Atualizar o código, validade e tentativas
    await conexao.execute(
      `UPDATE cadastro_pendente
       SET codigo_hash = ?,
           expira_em = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
           tentativas = 0,
           ultimo_reenvio_em = NOW()
       WHERE email = ?`,
      [codigoHash, emailLimpo],
    );

    // Enviar o novo código pelo Gmail
    await transporter.sendMail({
      from: `"Souza Storage" <${process.env.EMAIL_USER}>`,
      to: emailLimpo,
      subject: "Novo código de confirmação - Souza Storage",
      text: `Seu novo código de confirmação é: ${codigo}. Ele expira em 10 minutos.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 25px;">
          <h2 style="color: #0865f9;">Souza Storage</h2>
          <p>Você solicitou um novo código de confirmação.</p>
          <p>Use o código abaixo para confirmar seu cadastro:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 10px; padding: 20px; background: #f1f1f1; text-align: center;">
            ${codigo}
          </div>
          <p>Este código é válido por 10 minutos.</p>
          <p>Se você não solicitou este código, ignore esta mensagem.</p>
        </div>
      `,
    });

    return res.status(200).json({
      mensagem: "Um novo código foi enviado para seu e-mail.",
    });
  } catch (erro) {
    console.error("Erro ao reenviar código:", erro);

    return res.status(500).json({
      mensagem: "Não foi possível reenviar o código. Tente novamente.",
    });
  }
});

// CONFIRMAR CÓDIGO E CRIAR CONTA
app.post("/api/auth/cadastro/verificar", async (req, res) => {
  const conexaoTransacao = await conexao.getConnection();

  try {
    const { email, codigo } = req.body;
    const emailLimpo = String(email || "")
      .trim()
      .toLowerCase();
    const codigoLimpo = String(codigo || "").trim();

    if (!emailLimpo || !/^\d{4}$/.test(codigoLimpo)) {
      return res.status(400).json({
        mensagem: "Informe o e-mail e o código de quatro números.",
      });
    }

    await conexaoTransacao.beginTransaction();

    const [cadastros] = await conexaoTransacao.execute(
      `SELECT *
       FROM cadastro_pendente
       WHERE email = ?
       FOR UPDATE`,
      [emailLimpo],
    );

    if (cadastros.length === 0) {
      await conexaoTransacao.rollback();

      return res.status(404).json({
        mensagem: "Cadastro pendente não encontrado. Solicite um novo código.",
      });
    }

    const cadastro = cadastros[0];

    if (new Date(cadastro.expira_em).getTime() <= Date.now()) {
      await conexaoTransacao.execute(
        "DELETE FROM cadastro_pendente WHERE email = ?",
        [emailLimpo],
      );

      await conexaoTransacao.commit();

      return res.status(400).json({
        mensagem: "O código expirou. Faça o cadastro novamente.",
      });
    }

    if (cadastro.tentativas >= 5) {
      await conexaoTransacao.execute(
        "DELETE FROM cadastro_pendente WHERE email = ?",
        [emailLimpo],
      );

      await conexaoTransacao.commit();

      return res.status(429).json({
        mensagem: "Limite de tentativas atingido. Faça o cadastro novamente.",
      });
    }

    const codigoCorreto = await bcrypt.compare(
      codigoLimpo,
      cadastro.codigo_hash,
    );

    if (!codigoCorreto) {
      await conexaoTransacao.execute(
        `UPDATE cadastro_pendente
         SET tentativas = tentativas + 1
         WHERE email = ?`,
        [emailLimpo],
      );

      await conexaoTransacao.commit();

      return res.status(400).json({
        mensagem: "Código incorreto. Verifique seu e-mail.",
      });
    }

    const [resultado] = await conexaoTransacao.execute(
      `INSERT INTO usuario (nome, email, cnpj, senha)
       VALUES (?, ?, ?, ?)`,
      [cadastro.nome, cadastro.email, cadastro.cnpj, cadastro.senha],
    );

    await conexaoTransacao.execute(
      "DELETE FROM cadastro_pendente WHERE email = ?",
      [emailLimpo],
    );

    await conexaoTransacao.commit();

    const token = jwt.sign(
      { usuarioId: resultado.insertId },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    return res.status(201).json({
      mensagem: "E-mail confirmado e conta criada com sucesso!",
      token,
      usuario: {
        id: resultado.insertId,
        nome: cadastro.nome,
        email: cadastro.email,
      },
    });
  } catch (erro) {
    await conexaoTransacao.rollback();

    console.error("Erro ao confirmar cadastro:", erro);

    if (erro.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensagem: "Este e-mail ou CNPJ já está cadastrado.",
      });
    }

    return res.status(500).json({
      mensagem: "Não foi possível confirmar o cadastro.",
    });
  } finally {
    conexaoTransacao.release();
  }
});

// LOGIN DE EMPRESA
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        mensagem: "Informe o e-mail e a senha.",
      });
    }

    const emailLimpo = email.trim().toLowerCase();

    // Procurar empresa
    const [usuarios] = await conexao.execute(
      `SELECT id, nome, email, senha
             FROM usuario
             WHERE email = ?`,
      [emailLimpo],
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensagem: "E-mail ou senha incorretos.",
      });
    }

    const usuario = usuarios[0];

    // Comparar senha com hash armazenado
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({
        mensagem: "E-mail ou senha incorretos.",
      });
    }

    // Gerar token
    const token = jwt.sign({ usuarioId: usuario.id }, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });

    return res.json({
      mensagem: "Login realizado com sucesso!",
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
    });
  } catch (erro) {
    console.error("Erro no login:", erro.message);

    return res.status(500).json({
      mensagem: "Erro ao realizar login.",
    });
  }
});

// VERIFICAR SE A SESSÃO DO USUÁRIO AINDA É VÁLIDA
app.get("/api/auth/verificar", autenticar, async (req, res) => {
  try {
    const [usuarios] = await conexao.execute(
      `SELECT id, nome, email
       FROM usuario
       WHERE id = ?`,
      [req.usuarioId],
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensagem: "Usuário não encontrado.",
      });
    }

    return res.status(200).json({
      autenticado: true,
      usuario: usuarios[0],
    });
  } catch (erro) {
    console.error("Erro ao verificar sessão:", erro);

    return res.status(500).json({
      mensagem: "Erro ao verificar sessão.",
    });
  }
});

// ==========================================
// INFORMAÇÕES DA CONTA DA EMPRESA
// ==========================================

// BUSCAR INFORMAÇÕES DA CONTA
app.get("/api/conta", autenticar, async (req, res) => {
  try {
    const [usuarios] = await conexao.execute(
      `SELECT id, nome, cnpj, email, logo
       FROM usuario
       WHERE id = ?`,
      [req.usuarioId],
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        mensagem: "Conta não encontrada.",
      });
    }

    return res.status(200).json({
      usuario: usuarios[0],
    });
  } catch (erro) {
    console.error("Erro ao buscar conta:", erro);

    return res.status(500).json({
      mensagem: "Erro ao carregar informações da conta.",
    });
  }
});

// ATUALIZAR INFORMAÇÕES DA CONTA
app.put(
  "/api/conta",
  autenticar,
  (req, res, next) => {
    uploadLogo.single("logo")(req, res, (erro) => {
      if (erro) {
        const mensagem =
          erro.code === "LIMIT_FILE_SIZE"
            ? "A imagem deve ter no máximo 2 MB."
            : erro.message;

        return res.status(400).json({ mensagem });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      const nome = String(req.body.nome || "").trim();
      const email = String(req.body.email || "")
        .trim()
        .toLowerCase();

      const cnpj = String(req.body.cnpj || "").replace(/\D/g, "");

      if (!nome || !email || !cnpj) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(400).json({
          mensagem: "Preencha todos os campos.",
        });
      }

      if (nome.length > 150 || email.length > 150) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(400).json({
          mensagem: "Um dos campos ultrapassou o limite de caracteres.",
        });
      }

      if (!email.includes("@")) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(400).json({
          mensagem: "Informe um e-mail válido.",
        });
      }

      if (cnpj.length !== 14) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(400).json({
          mensagem: "O CNPJ deve conter 14 números.",
        });
      }

      const [usuarios] = await conexao.execute(
        "SELECT id FROM usuario WHERE id = ?",
        [req.usuarioId],
      );

      if (usuarios.length === 0) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(404).json({
          mensagem: "Conta não encontrada.",
        });
      }

      const [duplicados] = await conexao.execute(
        `SELECT id FROM usuario
         WHERE (email = ? OR cnpj = ?)
         AND id <> ?`,
        [email, cnpj, req.usuarioId],
      );

      if (duplicados.length > 0) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(409).json({
          mensagem: "Este e-mail ou CNPJ já pertence a outra conta.",
        });
      }

      let resultado;

      if (req.file) {
        const caminhoLogo = `/arquivos/logos/${req.file.filename}`;

        [resultado] = await conexao.execute(
          `UPDATE usuario
           SET nome = ?, cnpj = ?, email = ?, logo = ?
           WHERE id = ?`,
          [nome, cnpj, email, caminhoLogo, req.usuarioId],
        );
      } else {
        [resultado] = await conexao.execute(
          `UPDATE usuario
           SET nome = ?, cnpj = ?, email = ?
           WHERE id = ?`,
          [nome, cnpj, email, req.usuarioId],
        );
      }

      if (resultado.affectedRows === 0) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(404).json({
          mensagem: "Não foi possível atualizar a conta.",
        });
      }

      const [contasAtualizadas] = await conexao.execute(
        `SELECT id, nome, cnpj, email, logo
         FROM usuario
         WHERE id = ?`,
        [req.usuarioId],
      );

      return res.status(200).json({
        mensagem: "Informações da conta atualizadas com sucesso!",
        usuario: contasAtualizadas[0],
      });
    } catch (erro) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }

      console.error("Erro ao atualizar conta:", erro);

      if (erro.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          mensagem: "Este e-mail ou CNPJ já está cadastrado.",
        });
      }

      return res.status(500).json({
        mensagem: "Erro ao atualizar informações da conta.",
      });
    }
  },
);

// ==========================================
// RECUPERAÇÃO DE SENHA
// ==========================================

async function enviarCodigoRecuperacao(email, nome) {
  const codigo = crypto.randomInt(0, 10000).toString().padStart(4, "0");
  const codigoHash = await bcrypt.hash(codigo, 10);

  await conexao.execute(
    `INSERT INTO recuperacao_senha (email, codigo_hash, expira_em)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
     ON DUPLICATE KEY UPDATE
       codigo_hash = VALUES(codigo_hash),
       expira_em = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
       criado_em = NOW()`,
    [email, codigoHash],
  );

  await transporter.sendMail({
    from: `"Souza Storage" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Recuperação de senha - Souza Storage",
    text: `Olá, ${nome}. Seu código de recuperação é: ${codigo}. Ele expira em 10 minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 25px;">
        <h2 style="color: #0865f9;">Souza Storage</h2>
        <p>Olá, ${nome}!</p>
        <p>Use o código abaixo para recuperar sua senha:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 10px; padding: 20px; background: #f1f1f1; text-align: center;">
          ${codigo}
        </div>
        <p>Este código é válido por 10 minutos.</p>
        <p>Se você não solicitou a recuperação, ignore esta mensagem.</p>
      </div>
    `,
  });
}

// SOLICITAR CÓDIGO
app.post("/api/auth/senha/solicitar-codigo", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        mensagem: "Informe um e-mail válido.",
      });
    }

    const [usuarios] = await conexao.execute(
      "SELECT nome, email FROM usuario WHERE email = ?",
      [email],
    );

    // Resposta genérica para não revelar se o e-mail possui cadastro.
    if (usuarios.length === 0) {
      return res.status(200).json({
        mensagem: "Se o e-mail estiver cadastrado, você receberá um código.",
      });
    }

    await enviarCodigoRecuperacao(email, usuarios[0].nome);

    return res.status(200).json({
      mensagem: "Código enviado para seu e-mail.",
    });
  } catch (erro) {
    console.error("Erro ao solicitar recuperação:", erro);

    return res.status(500).json({
      mensagem: "Não foi possível enviar o código. Tente novamente.",
    });
  }
});

// REENVIAR CÓDIGO
app.post("/api/auth/senha/reenviar-codigo", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        mensagem: "Informe um e-mail válido.",
      });
    }

    const [usuarios] = await conexao.execute(
      "SELECT nome, email FROM usuario WHERE email = ?",
      [email],
    );

    if (usuarios.length === 0) {
      return res.status(200).json({
        mensagem: "Se o e-mail estiver cadastrado, você receberá um código.",
      });
    }

    await enviarCodigoRecuperacao(email, usuarios[0].nome);

    return res.status(200).json({
      mensagem: "Um novo código foi enviado para seu e-mail.",
    });
  } catch (erro) {
    console.error("Erro ao reenviar código de recuperação:", erro);

    return res.status(500).json({
      mensagem: "Não foi possível reenviar o código.",
    });
  }
});

// VERIFICAR CÓDIGO
app.post("/api/auth/senha/verificar-codigo", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const codigo = String(req.body.codigo || "").trim();

    if (!email || !/^\d{4}$/.test(codigo)) {
      return res.status(400).json({
        mensagem: "Informe o e-mail e o código de quatro números.",
      });
    }

    const [registros] = await conexao.execute(
      `SELECT codigo_hash, (expira_em > NOW()) AS valido
       FROM recuperacao_senha
       WHERE email = ?`,
      [email],
    );

    if (registros.length === 0 || !registros[0].valido) {
      return res.status(400).json({
        mensagem: "Código expirado ou não encontrado. Solicite outro código.",
      });
    }

    const codigoCorreto = await bcrypt.compare(
      codigo,
      registros[0].codigo_hash,
    );

    if (!codigoCorreto) {
      return res.status(400).json({
        mensagem: "Código incorreto. Confira os números enviados por e-mail.",
      });
    }

    return res.status(200).json({
      mensagem: "Código confirmado com sucesso!",
    });
  } catch (erro) {
    console.error("Erro ao verificar código de recuperação:", erro);

    return res.status(500).json({
      mensagem: "Não foi possível verificar o código.",
    });
  }
});

// REDEFINIR SENHA
app.post("/api/auth/senha/redefinir", async (req, res) => {
  const conexaoTransacao = await conexao.getConnection();

  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const codigo = String(req.body.codigo || "").trim();
    const novaSenha = String(req.body.novaSenha || "");

    if (!email || !/^\d{4}$/.test(codigo) || novaSenha.length < 8) {
      return res.status(400).json({
        mensagem:
          "Informe os dados corretamente. A senha deve ter pelo menos 8 caracteres.",
      });
    }

    await conexaoTransacao.beginTransaction();

    const [registros] = await conexaoTransacao.execute(
      `SELECT codigo_hash, (expira_em > NOW()) AS valido
       FROM recuperacao_senha
       WHERE email = ?
       FOR UPDATE`,
      [email],
    );

    if (registros.length === 0 || !registros[0].valido) {
      await conexaoTransacao.rollback();

      return res.status(400).json({
        mensagem: "Código expirado ou não encontrado. Solicite outro código.",
      });
    }

    const codigoCorreto = await bcrypt.compare(
      codigo,
      registros[0].codigo_hash,
    );

    if (!codigoCorreto) {
      await conexaoTransacao.rollback();

      return res.status(400).json({
        mensagem: "Código incorreto. Solicite outro código se necessário.",
      });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 12);

    const [resultado] = await conexaoTransacao.execute(
      "UPDATE usuario SET senha = ? WHERE email = ?",
      [senhaHash, email],
    );

    if (resultado.affectedRows === 0) {
      await conexaoTransacao.rollback();

      return res.status(404).json({
        mensagem: "Conta não encontrada.",
      });
    }

    await conexaoTransacao.execute(
      "DELETE FROM recuperacao_senha WHERE email = ?",
      [email],
    );

    await conexaoTransacao.commit();

    return res.status(200).json({
      mensagem: "Senha alterada com sucesso!",
    });
  } catch (erro) {
    await conexaoTransacao.rollback();

    console.error("Erro ao redefinir senha:", erro);

    return res.status(500).json({
      mensagem: "Não foi possível alterar a senha.",
    });
  } finally {
    conexaoTransacao.release();
  }
});

// ==========================================
// NOTIFICAÇÕES
// ==========================================

// LISTAR NOTIFICAÇÕES DO USUÁRIO
app.get("/api/notificacoes", autenticar, async (req, res) => {
  try {
    const [notificacoes] = await conexao.execute(
      `SELECT id, produto_id, tipo, titulo, mensagem, lida, criado_em
       FROM notificacoes
       WHERE usuario_id = ?
       ORDER BY criado_em DESC, id DESC`,
      [req.usuarioId],
    );

    const naoLidas = notificacoes.filter(
      (notificacao) => notificacao.lida === 0,
    ).length;

    return res.status(200).json({
      notificacoes,
      naoLidas,
    });
  } catch (erro) {
    console.error("Erro ao buscar notificações:", erro);

    return res.status(500).json({
      mensagem: "Erro ao carregar notificações.",
    });
  }
});

// MARCAR UMA NOTIFICAÇÃO COMO LIDA
app.patch("/api/notificacoes/:id/lida", autenticar, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID da notificação inválido.",
      });
    }

    const [resultado] = await conexao.execute(
      `UPDATE notificacoes
       SET lida = 1
       WHERE id = ? AND usuario_id = ?`,
      [id, req.usuarioId],
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensagem: "Notificação não encontrada.",
      });
    }

    return res.status(200).json({
      mensagem: "Notificação marcada como lida.",
    });
  } catch (erro) {
    console.error("Erro ao marcar notificação:", erro);

    return res.status(500).json({
      mensagem: "Erro ao atualizar notificação.",
    });
  }
});

// MARCAR TODAS AS NOTIFICAÇÕES COMO LIDAS
app.patch("/api/notificacoes/lidas", autenticar, async (req, res) => {
  try {
    await conexao.execute(
      `UPDATE notificacoes
       SET lida = 1
       WHERE usuario_id = ? AND lida = 0`,
      [req.usuarioId],
    );

    return res.status(200).json({
      mensagem: "Todas as notificações foram marcadas como lidas.",
    });
  } catch (erro) {
    console.error("Erro ao marcar notificações:", erro);

    return res.status(500).json({
      mensagem: "Erro ao atualizar notificações.",
    });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;

// LER ARQUIVOS CSV E XLSX

async function lerArquivoImportacao(arquivo) {
  const extensao = path.extname(arquivo.originalname).toLowerCase();

  const workbook = new ExcelJS.Workbook();

  if (extensao === ".xlsx") {
    await workbook.xlsx.load(arquivo.buffer);
  } else if (extensao === ".csv") {
    let conteudo = arquivo.buffer.toString("utf8");

    // Remover BOM do arquivo, quando existir.
    conteudo = conteudo.replace(/^\uFEFF/, "");

    // Identificar o separador utilizado.
    const primeiraLinha = conteudo.split(/\r?\n/).find((linha) => linha.trim());

    if (!primeiraLinha) {
      throw new Error("O arquivo está vazio.");
    }

    const quantidadeVirgulas = (primeiraLinha.match(/,/g) || []).length;
    const quantidadePontoVirgulas = (primeiraLinha.match(/;/g) || []).length;

    const separador = quantidadePontoVirgulas > quantidadeVirgulas ? ";" : ",";

    await workbook.csv.read(Readable.from([conteudo]), {
      parserOptions: {
        delimiter: separador,
      },
    });
  }

  const planilha = workbook.worksheets[0];

  if (!planilha || planilha.rowCount === 0) {
    throw new Error("Não foi encontrada uma planilha com dados.");
  }

  // Identificar as colunas pelo cabeçalho.
  function normalizarCabecalho(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function obterValorCelula(celula) {
    return String(celula.text ?? "").trim();
  }

  const cabecalho = planilha.getRow(1);

  let colunaProduto = null;
  let colunaMarca = null;

  cabecalho.eachCell((celula, numeroColuna) => {
    const nomeColuna = normalizarCabecalho(obterValorCelula(celula));

    if (nomeColuna === "produto") {
      colunaProduto = numeroColuna;
    }

    if (nomeColuna === "marca") {
      colunaMarca = numeroColuna;
    }
  });

  if (!colunaProduto || !colunaMarca) {
    throw new Error('O arquivo precisa conter as colunas "produto" e "marca".');
  }

  const produtos = [];
  const erros = [];

  planilha.eachRow((linha, numeroLinha) => {
    if (numeroLinha === 1) return;

    const produto = obterValorCelula(linha.getCell(colunaProduto));

    const marca = obterValorCelula(linha.getCell(colunaMarca));

    // Ignorar linhas completamente vazias.
    if (!produto && !marca) return;

    if (!produto || !marca) {
      erros.push(`Linha ${numeroLinha}: produto e marca são obrigatórios.`);
      return;
    }

    if (produto.length > 255 || marca.length > 150) {
      erros.push(`Linha ${numeroLinha}: limite de caracteres ultrapassado.`);
      return;
    }

    produtos.push({
      produto,
      marca,
    });
  });

  if (produtos.length === 0 && erros.length === 0) {
    throw new Error("Nenhum produto foi encontrado no arquivo.");
  }

  if (produtos.length > 10000) {
    throw new Error("O arquivo pode conter no máximo 10.000 produtos.");
  }

  if (erros.length > 0) {
    const mensagem = erros.slice(0, 10).join("\n");

    throw new Error(`Existem problemas no arquivo:\n${mensagem}`);
  }

  return produtos;
}

// Listar produtos da empresa autenticada
app.get("/api/produtos", autenticar, async (req, res) => {
  try {
    const [produtos] = await conexao.execute(
      `SELECT id, produto, marca, imagem, status, criado_em, atualizado_em
             FROM produtos
             WHERE usuario_id = ? AND status <> 2
             ORDER BY produto ASC`,
      [req.usuarioId],
    );

    return res.status(200).json({
      mensagem: "Produtos carregados com sucesso!",
      total: produtos.length,
      produtos,
    });
  } catch (erro) {
    console.error("Erro ao listar produtos:", erro);

    return res.status(500).json({
      mensagem: "Erro ao carregar os produtos.",
    });
  }
});

// CADASTRAR PRODUTO
app.post("/api/produtos", autenticar, async (req, res) => {
  let conexaoProduto;
  let transacaoIniciada = false;

  try {
    const { produto, marca, imagem } = req.body;

    // Validar os campos obrigatórios
    if (
      typeof produto !== "string" ||
      typeof marca !== "string" ||
      !produto.trim() ||
      !marca.trim()
    ) {
      return res.status(400).json({
        mensagem: "Informe o nome do produto e a marca.",
      });
    }

    const produtoLimpo = produto.trim();
    const marcaLimpa = marca.trim();

    // Validar imagem opcional
    if (imagem !== undefined && imagem !== null && typeof imagem !== "string") {
      return res.status(400).json({
        mensagem: "O campo imagem deve ser um texto válido.",
      });
    }

    const imagemLimpa =
      typeof imagem === "string" && imagem.trim() ? imagem.trim() : null;

    if (produtoLimpo.length > 255 || marcaLimpa.length > 150) {
      return res.status(400).json({
        mensagem: "O nome ou a marca ultrapassou o limite de caracteres.",
      });
    }

    conexaoProduto = await conexao.getConnection();

    await conexaoProduto.beginTransaction();
    transacaoIniciada = true;

    // Cadastrar produto
    const [resultado] = await conexaoProduto.execute(
      `INSERT INTO produtos (usuario_id, produto, marca, imagem, status)
       VALUES (?, ?, ?, ?, 0)`,
      [req.usuarioId, produtoLimpo, marcaLimpa, imagemLimpa],
    );

    const produtoId = resultado.insertId;

    // Registrar notificação
    await conexaoProduto.execute(
      `INSERT INTO notificacoes
       (usuario_id, produto_id, tipo, titulo, mensagem)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.usuarioId,
        produtoId,
        "cadastro",
        "Produto cadastrado",
        `O produto "${produtoLimpo}" foi cadastrado com sucesso.`,
      ],
    );

    await conexaoProduto.commit();
    transacaoIniciada = false;

    return res.status(201).json({
      mensagem: "Produto cadastrado com sucesso!",
      produto: {
        id: produtoId,
        produto: produtoLimpo,
        marca: marcaLimpa,
        imagem: imagemLimpa,
        status: 0,
      },
    });
  } catch (erro) {
    if (transacaoIniciada && conexaoProduto) {
      await conexaoProduto.rollback();
    }

    console.error("Erro ao cadastrar produto:", erro);

    return res.status(500).json({
      mensagem: "Erro ao cadastrar produto.",
    });
  } finally {
    if (conexaoProduto) {
      conexaoProduto.release();
    }
  }
});

// EDITAR PRODUTO
app.put("/api/produtos/:id", autenticar, async (req, res) => {
  let conexaoProduto;
  let transacaoIniciada = false;

  try {
    const id = Number(req.params.id);
    const { produto, marca, imagem } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do produto inválido.",
      });
    }

    // Validar os campos obrigatórios
    if (
      typeof produto !== "string" ||
      typeof marca !== "string" ||
      !produto.trim() ||
      !marca.trim()
    ) {
      return res.status(400).json({
        mensagem: "Informe o nome do produto e a marca.",
      });
    }

    const produtoLimpo = produto.trim();
    const marcaLimpa = marca.trim();

    if (produtoLimpo.length > 255 || marcaLimpa.length > 150) {
      return res.status(400).json({
        mensagem: "O nome ou a marca ultrapassou o limite de caracteres.",
      });
    }

    if (imagem !== undefined && imagem !== null && typeof imagem !== "string") {
      return res.status(400).json({
        mensagem: "O campo imagem deve ser um texto válido.",
      });
    }

    const imagemLimpa =
      typeof imagem === "string" && imagem.trim() ? imagem.trim() : null;

    conexaoProduto = await conexao.getConnection();

    await conexaoProduto.beginTransaction();
    transacaoIniciada = true;

    // Atualizar produto
    const [resultado] = await conexaoProduto.execute(
      `UPDATE produtos
       SET produto = ?, marca = ?, imagem = ?
       WHERE id = ? AND usuario_id = ? AND status <> 2`,
      [produtoLimpo, marcaLimpa, imagemLimpa, id, req.usuarioId],
    );

    if (resultado.affectedRows === 0) {
      await conexaoProduto.rollback();
      transacaoIniciada = false;

      return res.status(404).json({
        mensagem: "Produto não encontrado.",
      });
    }

    // Registrar notificação
    await conexaoProduto.execute(
      `INSERT INTO notificacoes
       (usuario_id, produto_id, tipo, titulo, mensagem)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.usuarioId,
        id,
        "edicao",
        "Produto editado",
        `O produto "${produtoLimpo}" foi atualizado com sucesso.`,
      ],
    );

    await conexaoProduto.commit();
    transacaoIniciada = false;

    return res.status(200).json({
      mensagem: "Produto atualizado com sucesso!",
    });
  } catch (erro) {
    if (transacaoIniciada && conexaoProduto) {
      await conexaoProduto.rollback();
    }

    console.error("Erro ao editar produto:", erro);

    return res.status(500).json({
      mensagem: "Erro ao atualizar produto.",
    });
  } finally {
    if (conexaoProduto) {
      conexaoProduto.release();
    }
  }
});

// EXCLUIR PRODUTO (EXCLUSÃO LÓGICA)
app.delete("/api/produtos/:id", autenticar, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do produto inválido.",
      });
    }

    const [resultado] = await conexao.execute(
      `UPDATE produtos
       SET status = 2
       WHERE id = ? AND usuario_id = ? AND status <> 2`,
      [id, req.usuarioId],
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensagem: "Produto não encontrado.",
      });
    }

    return res.status(200).json({
      mensagem: "Produto excluído com sucesso!",
    });
  } catch (erro) {
    console.error("Erro ao excluir produto:", erro);

    return res.status(500).json({
      mensagem: "Erro ao excluir produto.",
    });
  }
});

// ENVIAR PRODUTOS PARA REPOSIÇÃO
app.post("/api/produtos/reposicao", autenticar, async (req, res) => {
  let conexaoTransacao;
  let transacaoIniciada = false;

  try {
    const { ids } = req.body;

    // Validar os IDs recebidos
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > 200 ||
      !ids.every((id) => Number.isInteger(id) && id > 0)
    ) {
      return res.status(400).json({
        mensagem: "Informe uma lista válida de produtos.",
      });
    }

    // Remover IDs repetidos
    const idsUnicos = [...new Set(ids)];

    conexaoTransacao = await conexao.getConnection();

    await conexaoTransacao.beginTransaction();
    transacaoIniciada = true;

    const placeholders = idsUnicos.map(() => "?").join(", ");

    // Buscar produtos disponíveis para reposição
    const [produtosDisponiveis] = await conexaoTransacao.execute(
      `SELECT id, produto
       FROM produtos
       WHERE usuario_id = ?
       AND status = 0
       AND id IN (${placeholders})
       FOR UPDATE`,
      [req.usuarioId, ...idsUnicos],
    );

    if (produtosDisponiveis.length !== idsUnicos.length) {
      await conexaoTransacao.rollback();
      transacaoIniciada = false;

      return res.status(409).json({
        mensagem: "Um ou mais produtos não estão disponíveis para reposição.",
      });
    }

    // Atualizar o status dos produtos selecionados
    const [resultado] = await conexaoTransacao.execute(
      `UPDATE produtos
       SET status = 1
       WHERE usuario_id = ?
       AND status = 0
       AND id IN (${placeholders})`,
      [req.usuarioId, ...idsUnicos],
    );

    if (resultado.affectedRows !== idsUnicos.length) {
      throw new Error("Não foi possível atualizar todos os produtos.");
    }

    // Criar uma notificação para cada produto enviado
    for (const produto of produtosDisponiveis) {
      await conexaoTransacao.execute(
        `INSERT INTO notificacoes
         (usuario_id, produto_id, tipo, titulo, mensagem)
         VALUES (?, ?, ?, ?, ?)`,
        [
          req.usuarioId,
          produto.id,
          "reposicao",
          "Produto enviado para reposição",
          `O produto "${produto.produto}" foi enviado para reposição.`,
        ],
      );
    }

    await conexaoTransacao.commit();
    transacaoIniciada = false;

    return res.status(200).json({
      mensagem: "Produtos enviados para reposição com sucesso!",
      total: resultado.affectedRows,
      ids: idsUnicos,
    });
  } catch (erro) {
    if (transacaoIniciada && conexaoTransacao) {
      await conexaoTransacao.rollback();
    }

    console.error("Erro ao enviar produtos para reposição:", erro);

    return res.status(500).json({
      mensagem: "Erro ao enviar produtos para reposição.",
    });
  } finally {
    if (conexaoTransacao) {
      conexaoTransacao.release();
    }
  }
});
// IMPORTAR PRODUTOS POR CSV OU EXCEL

app.post(
  "/api/produtos/importar",
  autenticar,

  (req, res, next) => {
    uploadImportacao.single("arquivo")(req, res, (erro) => {
      if (erro) {
        const mensagem =
          erro.code === "LIMIT_FILE_SIZE"
            ? "O arquivo deve ter no máximo 5 MB."
            : erro.message;

        return res.status(400).json({ mensagem });
      }

      next();
    });
  },

  async (req, res) => {
    let conexaoImportacao;
    let transacaoIniciada = false;

    try {
      if (!req.file) {
        return res.status(400).json({
          mensagem: "Selecione um arquivo para importar.",
        });
      }

      // Ler e validar os produtos do arquivo.
      const produtos = await lerArquivoImportacao(req.file);

      conexaoImportacao = await conexao.getConnection();

      await conexaoImportacao.beginTransaction();
      transacaoIniciada = true;

      // Cadastrar cada produto e sua notificação.
      for (const item of produtos) {
        const [resultado] = await conexaoImportacao.execute(
          `INSERT INTO produtos
           (usuario_id, produto, marca, imagem, status)
           VALUES (?, ?, ?, NULL, 0)`,
          [req.usuarioId, item.produto, item.marca],
        );

        await conexaoImportacao.execute(
          `INSERT INTO notificacoes
           (usuario_id, produto_id, tipo, titulo, mensagem)
           VALUES (?, ?, ?, ?, ?)`,
          [
            req.usuarioId,
            resultado.insertId,
            "cadastro",
            "Produto importado",
            `O produto "${item.produto}" foi importado com sucesso.`,
          ],
        );
      }

      await conexaoImportacao.commit();
      transacaoIniciada = false;

      return res.status(201).json({
        mensagem: "Produtos importados com sucesso!",
        total: produtos.length,
      });
    } catch (erro) {
      if (transacaoIniciada && conexaoImportacao) {
        await conexaoImportacao.rollback();
      }

      console.error("Erro ao importar produtos:", erro);

      return res.status(400).json({
        mensagem: erro.message || "Não foi possível importar os produtos.",
      });
    } finally {
      if (conexaoImportacao) {
        conexaoImportacao.release();
      }
    }
  },
);

app.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});
