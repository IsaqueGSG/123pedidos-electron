const { ipcMain } = require("electron");
const { exec } = require("child_process");
const { salvarImpressora, getImpressoraSalva } = require("../services/printerConfig.service");

ipcMain.handle("printer-list", async () => {
  return new Promise((resolve, reject) => {
    exec('powershell -Command "Get-Printer | ForEach-Object {$_.Name}"', (err, stdout) => {
        if (err) return reject(err);

        const printers = stdout
          .split("\n")
          .map(p => p.trim())
          .filter(p => p.length > 0);

        resolve(printers.map(name => ({
          name,
          displayName: name,
          isDefault: false
        })));
      });
  });
});

ipcMain.handle("printer-set", (_, nome) => {
  salvarImpressora(nome);
  return true;
});

ipcMain.handle("printer-get", () => {
  return getImpressoraSalva();
});
