const { app, BrowserWindow } = require("electron");
const { createMainWindow } = require("./window.js");
const { initAutoUpdater, getIsUpdating } = require("./src/auto-updater.js");

// Carrega os módulos IPC
require("./ipc/print.js");
require("./ipc/whatsapp.js");

let mainWindow;

app.whenReady().then(() => {
  mainWindow = createMainWindow();

  // Inicializa o sistema de atualização refatorado
  initAutoUpdater(mainWindow);

  mainWindow.on("close", (e) => {
    if (getIsUpdating()) {
      e.preventDefault();
    }
  });
});

app.on("window-all-closed", () => {
  if (getIsUpdating()) return;
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});