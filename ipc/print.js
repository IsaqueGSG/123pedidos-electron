const { ipcMain } = require("electron");
const { imprimirPedidoPedidoObj } = require("../services/print.service");
const { salvarLargura, getLarguraSalva } = require("../services/printerConfig.service");

ipcMain.handle("imprimir-pedido", async (_, pedido, largura, numComanda) => {
  try {
    return await imprimirPedidoPedidoObj(pedido, largura, numComanda);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("getLargura", () => {
  return getLarguraSalva();
});

ipcMain.handle("setLargura", (_, largura) => {
  salvarLargura(largura);
  return true;
});


