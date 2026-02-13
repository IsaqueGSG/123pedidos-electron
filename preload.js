const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {

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
  },

  listPrinters: () =>
    ipcRenderer.invoke("printer-list"),

  setPrinter: (nome) =>
    ipcRenderer.invoke("printer-set", nome),

  getPrinter: () =>
    ipcRenderer.invoke("printer-get"),

  imprimirPedido: (pedido, largura = "80mm") => {
    const larguraNumerica = Number(String(largura).replace("mm", ""));
    return ipcRenderer.invoke("imprimir-pedido", pedido, larguraNumerica);
  },

  openExternal: (url) => shell.openExternal(url)

});

