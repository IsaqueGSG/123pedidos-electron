const { app } = require("electron");

const { createMainWindow } = require("./window");
require("./ipc/print");
require("./ipc/whatsapp");

app.whenReady().then(() => {
  createMainWindow();

  // inicializa depois da window existir
  const { initWhats } = require("./services/whatsapp.service");
  initWhats();
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
