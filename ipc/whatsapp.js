const { ipcMain } = require("electron");
const { enviarWhats } = require("../services/whatsapp.service");

ipcMain.handle("whats-send", async (_, payload) => {
  return enviarWhats(
    payload.idLoja,
    payload.telefone,
    payload.texto
  );
});

const { getClient } = require("../services/whatsapp.service");

ipcMain.handle("whats-init", (_, idLoja) => {
  getClient(idLoja);
});

