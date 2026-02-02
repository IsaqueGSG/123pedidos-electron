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
      sandbox: false,
      webSecurity: true
    }
  });

  // win.webContents.openDevTools();

  win.loadURL("https://123pedidos.web.app/selecionarloja");
}

module.exports = { createMainWindow };
