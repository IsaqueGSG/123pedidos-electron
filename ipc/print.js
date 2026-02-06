const { ipcMain } = require("electron");
const { imprimirHTMLSilencioso } = require("../services/print.service");

ipcMain.handle("print-html", async (_, { html, largura }) => {
  console.log(`🧾 [IPC] Impressão solicitada para largura: ${largura}`);
  return imprimirHTMLSilencioso(html, largura);
});

