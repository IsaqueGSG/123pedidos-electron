const { app } = require("electron");

const { createMainWindow } = require("./window");
const { initUpdater } = require("./updater");

require("./ipc/print");
require("./ipc/whatsapp");

app.whenReady().then(() => {
  createMainWindow();
  initUpdater();
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
