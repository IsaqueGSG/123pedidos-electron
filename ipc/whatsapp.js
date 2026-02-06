const { ipcMain } = require("electron");
const { enviarWhats, getSocket, statusMap } = require("../services/whatsapp.service");

// INIT
ipcMain.handle("whats-init", async (_, idLoja) => {
  statusMap.set(idLoja, "starting"); 
  await getSocket(idLoja);
  return true;
});

// STATUS
ipcMain.handle("whats-status", (_, idLoja) => {
  return statusMap.get(idLoja) || "disconnected";
});

// SEND
ipcMain.handle("whats-send", (_, payload) => {
  return enviarWhats(payload.idLoja, payload.telefone, payload.texto);
});
