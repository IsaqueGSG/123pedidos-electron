const { ipcMain } = require("electron");
const { enviarWhats } = require("../services/whatsapp.service");

ipcMain.handle("whats-send", async (_, payload) => {
  return enviarWhats(payload.telefone, payload.texto);
});
