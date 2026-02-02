const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { BrowserWindow } = require("electron");

const waClient = new Client({
  authStrategy: new LocalAuth({
    dataPath: "whatsapp-session"
  }),
  puppeteer: {
    headless: true
  }
});

function enviarParaRenderer(channel, payload) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.webContents.send(channel, payload);
  }
}

waClient.on("qr", async (qr) => {
  console.log("QR recebido");

  const qrBase64 = await QRCode.toDataURL(qr);

  enviarParaRenderer("whats-qr", qrBase64);
});

waClient.on("ready", () => {
  enviarParaRenderer("whats-status", "ready");
});

waClient.on("authenticated", () => {
  enviarParaRenderer("whats-status", "authenticated");
});

waClient.on("disconnected", () => {
  enviarParaRenderer("whats-status", "disconnected");
});

waClient.initialize();

async function enviarWhats(telefone, texto) {
  try {
    const numero = "55" + telefone.replace(/\D/g, "") + "@c.us";
    await waClient.sendMessage(numero, texto);
    return { ok: true };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
}

function initWhats() {
  waClient.initialize();
}

module.exports = { enviarWhats, initWhats };
