const { Client, LocalAuth } = require("whatsapp-web.js");
const puppeteer = require("puppeteer");
const QRCode = require("qrcode");
const { BrowserWindow, app } = require("electron");
const path = require("path");
const fs = require("fs");

const clients = new Map();
const clientState = new Map();

function log(id, ...msg) {
  console.log(`[WHATS ${id}]`, ...msg); // aparece no terminal do PC

  // envia para a janela ativa
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.send('log-message', { id, msg });
  }
}


function enviarParaRenderer(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

function getSessionPath() {
  if (!app.isReady()) {
    throw new Error("Electron ainda não está ready");
  }

  const dir = path.join(app.getPath("userData"), "whatsapp-session");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

function getClient(idLoja) {
  if (!idLoja) throw new Error("idLoja não informado");

  if (clients.has(idLoja)) {
    log(idLoja, "Reutilizando client existente");
    return clients.get(idLoja);
  }

  log(idLoja, "Criando client");

  enviarParaRenderer("whats-status", { idLoja, status: "starting" });
  clientState.set(idLoja, "starting");

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: idLoja,
      dataPath: getSessionPath()
    }),
    puppeteer: {
      headless: true,
      executablePath: puppeteer.executablePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    }
  });


  client.on("qr", async (qr) => {
    log(idLoja, "QR recebido");

    const qrBase64 = await QRCode.toDataURL(qr);

    clientState.set(idLoja, "qr");

    enviarParaRenderer("whats-qr", { idLoja, qr: qrBase64 });
    enviarParaRenderer("whats-status", { idLoja, status: "qr" });
  });

  client.on("authenticated", () => {
    log(idLoja, "AUTHENTICATED");
    clientState.set(idLoja, "authenticated");
    enviarParaRenderer("whats-status", { idLoja, status: "authenticated" });
  });

  client.on("ready", () => {
    log(idLoja, "READY");
    clientState.set(idLoja, "ready");
    enviarParaRenderer("whats-status", { idLoja, status: "ready" });
  });

  client.on("disconnected", (reason) => {
    log(idLoja, "DISCONNECTED:", reason);
    clientState.set(idLoja, "disconnected");
    enviarParaRenderer("whats-status", { idLoja, status: "disconnected" });
    clients.delete(idLoja);
    setTimeout(() => {
      getClient(idLoja);
    }, 3000);
  });

  client.on("auth_failure", (msg) => {
    log(idLoja, "AUTH FAILURE:", msg);
  });

  client.on("loading_screen", (p, m) => {
    log(idLoja, `LOADING ${p}%`, m);
  });

  client.on("error", (err) => {
    log(idLoja, "ERROR:", err);
  });

  client.initialize();
  clients.set(idLoja, client);

  return client;
}

client.on("browser_disconnected", () => {
  log(idLoja, "Browser disconnected");
});


async function enviarWhats(idLoja, telefone, texto) {
  try {
    const client = getClient(idLoja);

    const st = clientState.get(idLoja);

    if (st !== "ready" && st !== "authenticated") {
      return { ok: false, erro: "WhatsApp não está pronto" };
    }

    const numero = "55" + telefone.replace(/\D/g, "") + "@c.us";

    await client.sendMessage(numero, texto);

    return { ok: true };
  } catch (err) {
    log(idLoja, "Erro enviar:", err);
    return { ok: false, erro: err.message };
  }
}

module.exports = {
  enviarWhats,
  getClient,
  clients,
  clientState
};
