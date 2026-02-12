const { ipcMain } = require("electron");
const { imprimirPedidoPedidoObj } = require("../services/print.service");

ipcMain.handle("imprimir-pedido", async (_, pedido, largura) => {
  try {
    return await imprimirPedidoPedidoObj(pedido, largura);
  } catch (error) {
    return { success: false, error: error.message };
  }
});
