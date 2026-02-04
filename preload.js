const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {

  printHTML: (html) =>
    ipcRenderer.invoke("print-html", html),

  enviarWhats: (idLoja, telefone, texto) =>
    ipcRenderer.invoke("whats-send", { idLoja, telefone, texto }),

  initWhats: (idLoja) =>
    ipcRenderer.invoke("whats-init", idLoja),

  getWhatsStatus: (idLoja) =>
    ipcRenderer.invoke("whats-status", idLoja),

  onWhatsQR: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on("whats-qr", h);
    return () => ipcRenderer.removeListener("whats-qr", h);
  },

  onWhatsStatus: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on("whats-status", h);
    return () => ipcRenderer.removeListener("whats-status", h);
  },

  onLogMessage: (callback) => {
    ipcRenderer.on("log-message", (event, data) => {
      callback(data);
    });
  }

});

