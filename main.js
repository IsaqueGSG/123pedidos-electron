const { app } = require("electron");

const { createMainWindow } = require("./window");

require("./ipc/print");
require("./ipc/whatsapp");
require("./ipc/printers");

app.whenReady().then(() => {
  createMainWindow();
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
