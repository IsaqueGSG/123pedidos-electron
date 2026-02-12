const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");

const { BrowserWindow, app } = require("electron");
const P = require("pino");
const path = require("path");
const fs = require("fs");

const sockets = new Map();
const statusMap = new Map();
const filas = new Map();


// ------------------------
function enviarRenderer(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

function log(id, ...msg) {
  console.log(`[BAILEYS ${id}]`, ...msg);
  enviarRenderer("log-message", { id, msg });
}


// ------------------------
function getAuthDir(idLoja) {
  const dir = path.join(app.getPath("userData"), "baileys", idLoja);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}


// ------------------------
async function criarSocket(idLoja) {
  try {
    log(idLoja, "Criando socket Baileys");

    const { state, saveCreds } = await useMultiFileAuthState(getAuthDir(idLoja));
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: "silent" }),
      browser: ["Chrome", "Desktop", "123pedidos"],
      markOnlineOnConnect: false,
      syncFullHistory: false
    });

    sock.ev.on("creds.update", saveCreds);

    attachEvents(sock, idLoja);

    sockets.set(idLoja, sock);

    statusMap.set(idLoja, "disconnected");
    enviarRenderer("whats-status", { idLoja, status: "disconnected" });

    return sock;

  } catch (err) {
    log(idLoja, "Erro criar socket:", err.message);

    statusMap.set(idLoja, "error");
    enviarRenderer("whats-status", { idLoja, status: "error" });

    throw err;
  }
}


// ------------------------
function attachEvents(sock, idLoja) {

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      const qrImg = await QRCode.toDataURL(qr);

      enviarRenderer("whats-qr", {
        idLoja,
        qr: qrImg
      });

      // 🔥 sempre que tiver QR = desconectado
      statusMap.set(idLoja, "disconnected");
      enviarRenderer("whats-status", { idLoja, status: "disconnected" });
    }

    if (connection === "open") {
      log(idLoja, "READY");

      statusMap.set(idLoja, "ready");
      enviarRenderer("whats-status", { idLoja, status: "ready" });

      processarFila(idLoja);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = code === DisconnectReason.loggedOut;

      log(idLoja, "Conexão fechada. Código:", code);

      statusMap.set(idLoja, "disconnected");
      enviarRenderer("whats-status", { idLoja, status: "disconnected" });

      try {
        sock?.end?.();
      } catch { }

      sockets.delete(idLoja);

      if (isLoggedOut) {
        const dir = getAuthDir(idLoja);
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }

      setTimeout(() => {
        if (!sockets.has(idLoja) && !creating.has(idLoja)) {
          getSocket(idLoja);
        }
      }, 2000);
    }

  });
}

// ------------------------
const creating = new Map();

async function getSocket(idLoja) {
  if (sockets.has(idLoja)) return sockets.get(idLoja);

  if (!creating.has(idLoja)) {
    creating.set(idLoja, criarSocket(idLoja).finally(() => {
      creating.delete(idLoja);
    }));
  }

  return creating.get(idLoja);
}

// =========================================================
/*
   ENVIO HUMANIZADO
*/
// =========================================================

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}


// simular digitando
async function simularDigitando(sock, jid, texto) {
  const tempo = Math.min(5000, texto.length * randomRange(60, 120));

  await sock.sendPresenceUpdate("composing", jid);
  await delay(tempo);
  await sock.sendPresenceUpdate("paused", jid);
}


// fila por loja
function enqueue(idLoja, job) {
  if (!filas.has(idLoja)) {
    filas.set(idLoja, {
      jobs: [],
      processing: false
    });
  }

  filas.get(idLoja).jobs.push(job);
}

// processador de fila
async function processarFila(idLoja) {
  const fila = filas.get(idLoja);
  if (!fila || fila.processing) return;

  fila.processing = true;

  while (fila.jobs.length > 0) {
    const job = fila.jobs.shift();
    try {
      await job();
    } catch (e) {
      log(idLoja, "Erro job:", e.message);
    }

    await delay(randomRange(4000, 9000));
  }

  fila.processing = false;
}



// ------------------------
async function enviarWhats(idLoja, telefone, texto) {

  enqueue(idLoja, async () => {

    const sock = await getSocket(idLoja);

    if (statusMap.get(idLoja) !== "ready") {
      log(idLoja, "Socket não pronto");
      return;
    }

    const numero = telefone.replace(/\D/g, "");
    const jid = `55${numero}@s.whatsapp.net`;

    // delay inicial humano
    await delay(randomRange(2000, 6000));

    // digitando
    await simularDigitando(sock, jid, texto);

    await sock.sendMessage(jid, { text: texto });

    log(idLoja, "Mensagem enviada:", jid);
  });

  processarFila(idLoja);

  return { ok: true };
}


// ------------------------
module.exports = {
  getSocket,
  enviarWhats,
  statusMap
};
