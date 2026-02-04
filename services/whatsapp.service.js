const { Client, LocalAuth } = require("whatsapp-web.js");
const puppeteer = require("puppeteer");
const QRCode = require("qrcode");

const { BrowserWindow, app } = require("electron");
const path = require("path");
const fs = require("fs");

const clients = new Map();
const clientState = new Map();

function log(id, ...msg) {
  console.log(`[WHATS ${id}]`, ...msg);
  enviarParaRenderer("log-message", { id, msg });
}

function enviarParaRenderer(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

function getSessionPath() {
  if (!app.isReady()) throw new Error("Electron ainda não está ready");

  const dir = path.join(app.getPath("userData"), "whatsapp-session");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return dir;
}

function getPuppeteerChrome() {
  try {
    const p = puppeteer.executablePath();
    console.log("Chromium path:", p);
    return p;
  } catch (e) {
    console.warn("Chromium não disponível:", e.message);
    return undefined;
  }
}


function buildPuppeteerConfig(useEmbedded = true) {
  const config = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-features=site-per-process"
    ]
  };

  if (useEmbedded) {
    const p = getPuppeteerChrome();
    if (p) config.executablePath = p;
  }

  return config;
}

function createClient(idLoja, useEmbedded) {
  log(idLoja, "Criando client — embedded:", useEmbedded);

  return new Client({
    authStrategy: new LocalAuth({
      clientId: idLoja,
      dataPath: getSessionPath()
    }),
    puppeteer: buildPuppeteerConfig(useEmbedded)
  });
}

function attachEvents(client, idLoja) {
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

  client.on("disconnected", async (reason) => {
    log(idLoja, "DISCONNECTED:", reason);

    clientState.set(idLoja, "disconnected");
    enviarParaRenderer("whats-status", { idLoja, status: "disconnected" });

    try { await client.destroy(); } catch { }

    clients.delete(idLoja);

    setTimeout(() => {
      if (!clients.has(idLoja)) getClient(idLoja);
    }, 3000);
  });

  client.on("auth_failure", (msg) => {
    log(idLoja, "AUTH FAILURE:", msg);
  });

  client.on("loading_screen", (p, m) => {
    log(idLoja, `LOADING ${p}%`, m);
  });

  client.on("error", (err) => {
    log(idLoja, "ERROR:", err.message);
  });

  client.on("browser_disconnected", () => {
    log(idLoja, "Browser disconnected");
  });
}

function initializeWithFallback(idLoja) {
  let client = createClient(idLoja, true);
  attachEvents(client, idLoja);

  clients.set(idLoja, client);

  client.initialize({ timeout: 60000 })
    .catch(async (err) => {
      log(idLoja, "INIT ERROR embedded:", err.message);

      if (
        err.message.includes("spawn") ||
        err.message.includes("EPERM") ||
        err.message.includes("Chrome")
      ) {
        log(idLoja, "Fallback automático → Chrome/Edge do sistema");

        try { await client.destroy(); } catch { }

        client = createClient(idLoja, false);
        attachEvents(client, idLoja);

        clients.set(idLoja, client);

        client.initialize().catch(err2 => {
          log(idLoja, "INIT ERROR fallback:", err2.message);
        });
      }
    });
}

function getClient(idLoja) {
  if (!idLoja) throw new Error("idLoja não informado");

  if (clients.has(idLoja)) {
    log(idLoja, "Reutilizando client existente");
    return clients.get(idLoja);
  }

  enviarParaRenderer("whats-status", { idLoja, status: "starting" });
  clientState.set(idLoja, "starting");

  initializeWithFallback(idLoja);

  return clients.get(idLoja);
}

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
    log(idLoja, "Erro enviar:", err.message);
    return { ok: false, erro: err.message };
  }
}

module.exports = {
  enviarWhats,
  getClient,
  clients,
  clientState
};
