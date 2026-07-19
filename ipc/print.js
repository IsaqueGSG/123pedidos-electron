const { ipcMain } = require("electron");
const {
  imprimirPedidoPedidoObj,
  salvarLargura,
  getLarguraSalva,
  salvarImpressora,
  getImpressoraSalva,
  verificarImpressoraCompartilhada
} = require("../services/print.service");
const { exec } = require("child_process");

ipcMain.handle(
  "imprimir-pedido",
  async (_, pedido, largura, numComanda, printer) => {
    try {
      return await imprimirPedidoPedidoObj(
        pedido,
        largura,
        numComanda,
        printer
      );
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
);

ipcMain.handle("getLargura", () => {
  return getLarguraSalva();
});

ipcMain.handle("setLargura", (_, largura) => {
  salvarLargura(largura);
  return true;
});


ipcMain.handle("printer-list", async () => {
  return new Promise((resolve, reject) => {

    const cmd =
      'Get-Printer | Select-Object Name,ShareName,Shared | ConvertTo-Json';

    exec(
      `powershell -NoProfile -Command "${cmd}"`,
      (err, stdout, stderr) => {

        // console.log("STDOUT:", stdout);
        // console.log("STDERR:", stderr);

        if (err) {
          return reject(err);
        }

        const printers = JSON.parse(stdout);

        resolve(
          (Array.isArray(printers) ? printers : [printers]).map(p => ({
            name: p.Name,
            displayName: p.Name,
            shared: p.Shared,
            shareName: p.ShareName
          }))
        );
      }
    );
  });
});

ipcMain.handle("printer-set", (_, printer) => {
  salvarImpressora(printer);
  return true;
});

ipcMain.handle("printer-get", () => {
  return getImpressoraSalva();
});


ipcMain.handle(
  "printer-open-properties",
  (_, printerName) => {
    exec(
      `rundll32 printui.dll,PrintUIEntry /p /n "${printerName}"`
    );

    return true;
  }
);

ipcMain.handle(
  "verificar-impressora-compartilhada",
  async (_, printerName) => {
    try {
      const isShared = await verificarImpressoraCompartilhada(printerName);
      return { success: true, isShared };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
);

