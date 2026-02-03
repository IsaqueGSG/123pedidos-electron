const { ipcMain } = require("electron");
const { enviarWhats, getClient } = require("../services/whatsapp.service");

ipcMain.handle("whats-send", async (_, payload) => {
  console.log("[IPC] whats-send", payload.idLoja, payload.telefone);

  return enviarWhats(
    payload.idLoja,
    payload.telefone,
    payload.texto
  );
});

ipcMain.handle("whats-init", async (_, idLoja) => {
  console.log("[IPC] whats-init:", idLoja);

  try {
    getClient(idLoja);
    return { ok: true };
  } catch (err) {
    console.error("[IPC] whats-init erro:", err);
    return { ok: false, erro: err.message };
  }
});


