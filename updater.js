const { autoUpdater } = require("electron-updater");
const { dialog } = require("electron");

function initUpdater() {
  console.log("🔄 Updater iniciado");

  // config antes de checar
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("checking-for-update", () => {
    console.log("🔍 Verificando atualização...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("⬇️ Update disponível:", info.version);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("✅ App já está na última versão");
  });

  autoUpdater.on("download-progress", (p) => {
    console.log(`📦 Baixando update: ${Math.round(p.percent)}%`);
  });

  autoUpdater.on("update-downloaded", () => {
    console.log("✅ Update baixado");

    dialog.showMessageBox({
      type: "info",
      title: "Atualização pronta",
      message: "Nova versão baixada. Reiniciar agora?",
      buttons: ["Sim", "Depois"]
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on("error", (err) => {
    console.log("❌ Erro update:", err);
  });

  // 👇 depois de configurar eventos → checa
  autoUpdater.checkForUpdatesAndNotify();
}

module.exports = { initUpdater };
