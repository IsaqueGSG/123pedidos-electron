const { app, BrowserWindow } = require("electron");
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

  win.webContents.session.clearCache().then(() => {
    if (!app.isPackaged) {
      win.loadURL("http://localhost:5173/login");
    } else {
      win.loadURL("https://123pedidos.web.app/login");
    }
  });
  

  return win;
}

module.exports = { createMainWindow };
