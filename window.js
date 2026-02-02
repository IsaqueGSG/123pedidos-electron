const { BrowserWindow } = require("electron");
const path = require("path");

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // limpa cache antes de carregar
  win.webContents.session.clearCache().then(() => {
    win.loadURL("https://123pedidos.web.app/selecionarloja");
  });

  // útil pra debug
  win.webContents.openDevTools();
}

module.exports = { createMainWindow };
