const { ipcMain, BrowserWindow } = require("electron");
const { salvarImpressora, getImpressoraSalva } = require("../services/printerConfig.service");

ipcMain.handle("printer-list", async () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return [];

  const printers = await win.webContents.getPrintersAsync();

  return printers.map(p => ({
    name: p.name,
    displayName: p.displayName,
    isDefault: p.isDefault
  }));
});

ipcMain.handle("printer-set", (_, nome) => {
  salvarImpressora(nome);
  return true;
});

ipcMain.handle("printer-get", () => {
  return getImpressoraSalva();
});
