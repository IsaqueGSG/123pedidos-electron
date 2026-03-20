const { ipcMain } = require("electron");
const { enviarWhats, getSocket, statusMap, logoutWhats } = require("../services/whatsapp.service");

ipcMain.handle("whats-logout", async (_, idLoja) => {
  await logoutWhats(idLoja);
  return { ok: true };
});

ipcMain.handle("whats-init", async (_, idLoja) => {
  await getSocket(idLoja);
  return true;
});

ipcMain.handle("whats-status", (_, idLoja) => {
  return statusMap.get(idLoja) || "disconnected";
});

ipcMain.handle("whats-send", (_, payload) => {
  return enviarWhats(payload.idLoja, payload.telefone, payload.texto);
});
