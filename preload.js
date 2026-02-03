const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {

  enviarWhats: (idLoja, telefone, texto) =>
    ipcRenderer.invoke("whats-send", { idLoja, telefone, texto }),

  printHTML: (html) =>
    ipcRenderer.invoke("print-html", html),

  onWhatsQR: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on("whats-qr", handler);
    return () => ipcRenderer.removeListener("whats-qr", handler);
  },

  onWhatsStatus: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on("whats-status", handler);
    return () => ipcRenderer.removeListener("whats-status", handler);
  },

  initWhats: (idLoja) => {
    console.log("[PRELOAD] initWhats", idLoja);
    return ipcRenderer.invoke("whats-init", idLoja);
  },


});
