const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const { BrowserWindow } = require("electron");

const clients = new Map(); // cache de sessões

function enviarParaRenderer(channel, payload) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send(channel, payload);
}

function getClient(idLoja) {
  if (clients.has(idLoja)) {
    return clients.get(idLoja);
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: idLoja,                 // 🔥 chave da loja
      dataPath: "whatsapp-session"
    }),
    puppeteer: { headless: true }
  });

  client.on("qr", async (qr) => {
    const qrBase64 = await QRCode.toDataURL(qr);
    enviarParaRenderer("whats-qr", { idLoja, qr: qrBase64 });
  });

  client.on("ready", () => {
    enviarParaRenderer("whats-status", { idLoja, status: "ready" });
  });

  client.on("authenticated", () => {
    enviarParaRenderer("whats-status", { idLoja, status: "authenticated" });
  });

  client.on("disconnected", () => {
    enviarParaRenderer("whats-status", { idLoja, status: "disconnected" });
  });

  client.initialize();

  clients.set(idLoja, client);

  return client;
}

async function enviarWhats(idLoja, telefone, texto) {
  try {
    const client = getClient(idLoja);

    const numero = "55" + telefone.replace(/\D/g, "") + "@c.us";
    await client.sendMessage(numero, texto);

    return { ok: true };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
}

module.exports = { enviarWhats, getClient };
