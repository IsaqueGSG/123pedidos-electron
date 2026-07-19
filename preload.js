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

  logoutWhats: (idLoja) =>
    ipcRenderer.invoke("whats-logout", idLoja),

  onLogMessage: (callback) => {
    ipcRenderer.on("log-message", (event, data) => {
      callback(data);
    });
  },

  resetWhats: (idLoja) => ipcRenderer.invoke("whats-reset", idLoja),

  listPrinters: () =>
    ipcRenderer.invoke("printer-list"),

  setPrinter: (nome) =>
    ipcRenderer.invoke("printer-set", nome),

  getPrinter: () =>
    ipcRenderer.invoke("printer-get"),

  imprimirPedido: (pedido, largura = "80mm", numComanda, printer) => {
    const larguraNumerica = Number(String(largura).replace("mm", ""));
    return ipcRenderer.invoke("imprimir-pedido", pedido, larguraNumerica, numComanda, printer);
  },

  getLargura: () => ipcRenderer.invoke("getLargura"),

  setLargura: (largura) => ipcRenderer.invoke("setLargura", largura),

  openExternal: (url) => shell.openExternal(url),

  openPrinterProperties: (printerName) =>
    ipcRenderer.invoke(
      "printer-open-properties",
      printerName
    ),

  verificarImpressoraCompartilhada: (printerName) => {
    return ipcRenderer.invoke(
      "verificar-impressora-compartilhada",
      printerName
    );
  }

});

