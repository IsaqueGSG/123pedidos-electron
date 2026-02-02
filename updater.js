const { autoUpdater } = require("electron-updater");
const { dialog } = require("electron");

function initUpdater() {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on("update-available", () => {
    console.log("⬇️ Update disponível");
  });

  autoUpdater.on("update-downloaded", () => {
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
    console.log("Erro update:", err);
  });
}

module.exports = { initUpdater };
