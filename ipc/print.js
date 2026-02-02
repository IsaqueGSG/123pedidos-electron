const { ipcMain } = require("electron");
const { imprimirHTMLSilencioso } = require("../services/print.service");

ipcMain.handle("print-html", async (_, html) => {
  console.log("🧾 [IPC] print-html chamado");
  return imprimirHTMLSilencioso(html);
});

