const { ipcMain } = require("electron");
const { imprimirHTMLSilencioso } = require("../services/print.service");

ipcMain.handle("imprimir-pedido", async (_, html, estilos, largura) => {
  try {
    const resultado = await imprimirHTMLSilencioso(html, estilos, Number(largura));
    return resultado;
  } catch (error) {
    console.error('Erro na impressão:', error);
    return {
      success: false,
      error: error.message,
      larguraUtilizada: largura
    };
  }
});
