const { app, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

const { createMainWindow } = require("./window");

require("./ipc/print");
require("./ipc/whatsapp");
require("./ipc/printers");

app.whenReady().then(async () => {
  createMainWindow();

  if (!app.isPackaged) {
    console.log("Modo dev — update desativado");
  } else {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
  }
});

autoUpdater.on("checking-for-update", () => {
  dialog.showMessageBox({
    type: "info",
    message: "🔎 Verificando atualizações..."
  });
});

autoUpdater.on("update-available", () => {
  dialog.showMessageBox({
    type: "info",
    message: "⬇️ Nova versão encontrada. Baixando..."
  });
});

autoUpdater.on("update-not-available", () => {
  dialog.showMessageBox({
    type: "info",
    message: "✅ App atualizado."
  });
});

autoUpdater.on("update-downloaded", () => {
  dialog.showMessageBox({
    type: "question",
    message: "✅ Atualização pronta. Reiniciar agora?",
    buttons: ["Reiniciar", "Depois"]
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on("error", (err) => {
  dialog.showMessageBox({
    type: "error",
    message: "❌ Erro no update: " + err.message
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  const { BrowserWindow } = require("electron");
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
