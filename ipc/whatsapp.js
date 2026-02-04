const { ipcMain } = require("electron");
const {
  enviarWhats,
  getClient,
  clientState
} = require("../services/whatsapp.service");

ipcMain.handle("whats-init", (_, idLoja) => {
  getClient(idLoja);
  return { ok: true };
});

ipcMain.handle("whats-send", (_, payload) => {
  return enviarWhats(
    payload.idLoja,
    payload.telefone,
    payload.texto
  );
});

ipcMain.handle("whats-status", (_, idLoja) => {
  return clientState.get(idLoja) || "disconnected";
});

