const { BrowserWindow } = require("electron");

async function imprimirHTMLSilencioso(html) {
  console.log("🧾 Pedido de impressão recebido");

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: false,
      contextIsolation: true
    }
  });

  await printWin.loadURL("about:blank");

  await printWin.webContents.executeJavaScript(`
    document.write(\`${html.replace(/`/g, "\\`")}\`);
    document.close();
  `);

  return new Promise((resolve) => {
    printWin.webContents.once("dom-ready", async () => {
      const printers = await printWin.webContents.getPrintersAsync();
      const printer = printers.find(p => p.isDefault);

      if (!printer) {
        console.log("❌ Sem impressora default");
        printWin.close();
        resolve(false);
        return;
      }

      printWin.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printer.name
        },
        (success, err) => {
          console.log("🧾 Resultado:", success, err);
          printWin.close();
          resolve(success);
        }
      );
    });
  });
}

module.exports = { imprimirHTMLSilencioso };
