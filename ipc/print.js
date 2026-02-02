const { ipcMain } = require("electron");
const { imprimirHTMLSilencioso } = require("../services/print.service");

ipcMain.handle("print-html", async (_, html) => {
  return imprimirHTMLSilencioso(html);
});
