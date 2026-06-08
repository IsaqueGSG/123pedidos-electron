const { app, BrowserWindow } = require("electron");
const { autoUpdater } = require("electron-updater");

const { createMainWindow } = require("./window");

require("./ipc/print");
require("./ipc/whatsapp");

let mainWindow;
let updateWindow;
let isUpdating = false;

autoUpdater.autoDownload = true;
// Melhor para atualização imediata (não esperar fechar app)
autoUpdater.autoInstallOnAppQuit = false;

// 🔒 Janela de atualização (bloqueia TOTALMENTE o app)
function createUpdateWindow() {
  if (updateWindow) return; // evita múltiplas janelas

  updateWindow = new BrowserWindow({
    width: 420,
    height: 220,
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
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  updateWindow.focus();

  // Desabilita interação com a janela principal
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(true);
    mainWindow.setFocusable(false);
  }

  updateWindow.loadURL(
    `data:text/html,
    <html>
      <body style="
        font-family: sans-serif;
        display:flex;
        align-items:center;
        justify-content:center;
        height:100vh;
        margin:0;
        background:#111;
        color:white;
        text-align:center;
      ">
        <div>
          <h2>🔄 Atualizando o sistema...</h2>
          <p>Baixando nova versão. Aguarde.</p>
          <p style="opacity:0.7;font-size:12px">
            Não feche o aplicativo
          </p>
        </div>
      </body>
    </html>`
  );
}

function checkUpdatesWithRetry() {
  autoUpdater.checkForUpdates().catch(() => {
    setTimeout(checkUpdatesWithRetry, 15000); // tenta novamente
  });
}

app.whenReady().then(() => {
  mainWindow = createMainWindow();

  if (!app.isPackaged) {
    console.log("Modo dev — update desativado");
    return;
  }

  setTimeout(checkUpdatesWithRetry, 5000);

  mainWindow.on("close", (e) => {
    if (isUpdating) {
      e.preventDefault();
    }
  });
});

autoUpdater.on("checking-for-update", () => {
  console.log("Verificando atualizações...");
});

autoUpdater.on("update-not-available", () => {
  console.log("App já está atualizado");
});

autoUpdater.on("update-available", () => {
  isUpdating = true;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(true);
    mainWindow.setFocusable(false);
    mainWindow.blur();
  }
  createUpdateWindow();
});

autoUpdater.on("update-downloaded", () => {
  autoUpdater.quitAndInstall(false, true);
});

autoUpdater.on("error", (err) => {
  console.error("Erro no update:", err);

  if (isUpdating) {
    app.quit(); // update obrigatório falhou
  } else {
    // tenta novamente depois
    setTimeout(checkUpdatesWithRetry, 15000);
  }
});

app.on("window-all-closed", () => {
  // Se estiver atualizando, não deixa o usuário fechar
  if (isUpdating) return;
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});