const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { BrowserWindow } = require("electron");

const clients = new Map();
const clientState = new Map();

function log(id, ...msg) {
  console.log(`[WHATS ${id}]`, ...msg);
}

function enviarParaRenderer(channel, payload) {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) {
    console.warn("[WHATS] Nenhuma janela para enviar evento:", channel);
    return;
  }

  win.webContents.send(channel, payload);
}

function getClient(idLoja) {
  if (!idLoja) throw new Error("idLoja não informado");

  if (clients.has(idLoja)) {
    log(idLoja, "Cliente já existe — reutilizando sessão");
    return clients.get(idLoja);
  }

  log(idLoja, "Criando novo client");

  enviarParaRenderer("whats-status", {
    idLoja,
    status: "starting"
  });

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: idLoja,
      dataPath: "whatsapp-session"
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
  });

  client.on("qr", async (qr) => {
    log(idLoja, "QR recebido");

    const qrBase64 = await QRCode.toDataURL(qr);

    enviarParaRenderer("whats-qr", {
      idLoja,
      qr: qrBase64
    });

    enviarParaRenderer("whats-status", {
      idLoja,
      status: "qr"
    });
  });

  client.on("ready", () => {
    log(idLoja, "READY");
    enviarParaRenderer("whats-status", {
      idLoja,
      status: "ready"
    });
  });

  client.on("authenticated", () => {
    log(idLoja, "AUTHENTICATED");
    enviarParaRenderer("whats-status", {
      idLoja,
      status: "authenticated"
    });
  });

  client.on("disconnected", (reason) => {
    log(idLoja, "DISCONNECTED:", reason);

    enviarParaRenderer("whats-status", {
      idLoja,
      status: "disconnected"
    });

    clients.delete(idLoja);
  });

  client.on("auth_failure", (msg) => {
    log(idLoja, "AUTH FAILURE:", msg);
  });

  client.on("change_state", (state) => {
    log(idLoja, "STATE:", state);
  });

  client.on("loading_screen", (percent, message) => {
    log(idLoja, `LOADING ${percent}%`, message);
  });

  client.on("error", (err) => {
    log(idLoja, "ERROR:", err);
  });

  try {
    client.initialize();
    log(idLoja, "initialize() chamado");
  } catch (err) {
    log(idLoja, "Erro ao inicializar:", err);
    throw err;
  }

  clients.set(idLoja, client);

  return client;
}

async function enviarWhats(idLoja, telefone, texto) {
  try {
    log(idLoja, "Enviando mensagem →", telefone);

    const client = getClient(idLoja);

    const numero = "55" + telefone.replace(/\D/g, "") + "@c.us";

    await client.sendMessage(numero, texto);

    log(idLoja, "Mensagem enviada OK");

    return { ok: true };
  } catch (err) {
    log(idLoja, "Erro enviar:", err);
    return { ok: false, erro: err.message };
  }
}

module.exports = { enviarWhats, getClient };
