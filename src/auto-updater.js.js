const { BrowserWindow } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

let updateWindow = null;
let isUpdating = false;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

function createUpdateWindow() {
  if (updateWindow) return;

  updateWindow = new BrowserWindow({
    width: 440,
    height: 240,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: true,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  updateWindow.loadFile(path.join(__dirname, "update.html"));
  updateWindow.focus();
}

function sendToUpdateWindow(channel, data) {
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.webContents.send(channel, data);
  }
}

function initAutoUpdater(mainWindowRef) {
  if (process.env.NODE_ENV === "development" || !require("electron").app.isPackaged) {
    console.log("Modo dev — update desativado");
    return;
  }

  const checkUpdatesWithRetry = () => {
    autoUpdater.checkForUpdates().catch(() => {
      setTimeout(checkUpdatesWithRetry, 15000);
    });
  };

  setTimeout(checkUpdatesWithRetry, 5000);

  autoUpdater.on("checking-for-update", () => {
    console.log("Verificando atualizações...");
  });

  autoUpdater.on("update-not-available", () => {
    console.log("App já está atualizado");
  });

  autoUpdater.on("update-available", (info) => {
    isUpdating = true;

    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.setIgnoreMouseEvents(true);
      mainWindowRef.setFocusable(false);
      mainWindowRef.blur();
    }
    createUpdateWindow();
  });

  autoUpdater.on("download-progress", (progressObj) => {
    sendToUpdateWindow("update-message", {
      status: "downloading",
      percent: progressObj.percent,
      version: progressObj.version,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    sendToUpdateWindow("update-message", { status: "installing" });
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 2000);
  });

  autoUpdater.on("error", (err) => {
    console.error("Erro no update:", err);
    if (isUpdating) {
      // Se falhou no meio do update obrigatório, encerra
      process.exit(1);
    } else {
      setTimeout(checkUpdatesWithRetry, 15000);
    }
  });
}

function getIsUpdating() {
  return isUpdating;
}

module.exports = { initAutoUpdater, getIsUpdating };