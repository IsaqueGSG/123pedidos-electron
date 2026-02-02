const { BrowserWindow } = require("electron");

async function imprimirHTMLSilencioso(html) {
  console.log("🧾 [PRINT] Pedido recebido");

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: false,
      contextIsolation: true
    }
  });

  printWin.webContents.on("did-finish-load", () => {
    console.log("🧾 [PRINT] did-finish-load");
  });

  printWin.webContents.on("dom-ready", () => {
    console.log("🧾 [PRINT] dom-ready");
  });

  printWin.webContents.on("did-fail-load", (_, code, desc) => {
    console.log("❌ [PRINT] fail-load", code, desc);
  });

  await printWin.loadURL("about:blank");

  console.log("🧾 [PRINT] escrevendo HTML");

  await printWin.webContents.executeJavaScript(`
    document.open();
    document.write(\`${html.replace(/`/g, "\\`")}\`);
    document.close();
  `);

  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        console.log("🧾 [PRINT] buscando impressoras...");

        const printers = await printWin.webContents.getPrintersAsync();
        console.log("🧾 [PRINT] impressoras encontradas:", printers.map(p => ({
          name: p.name,
          isDefault: p.isDefault
        })));

        if (!printers.length) {
          console.log("❌ [PRINT] nenhuma impressora encontrada");
          printWin.close();
          resolve(false);
          return;
        }

        const printer = printers.find(p => p.isDefault) || printers[0];

        console.log("🧾 [PRINT] usando impressora:", printer.name);

        printWin.webContents.print(
          {
            silent: true,
            printBackground: true,
            deviceName: printer.name
          },
          (success, err) => {
            console.log("🧾 [PRINT] resultado:", success, err);
            printWin.close();
            resolve(success);
          }
        );

      } catch (e) {
        console.log("❌ [PRINT] erro:", e);
        printWin.close();
        resolve(false);
      }
    }, 500); // ⬅️ delay crítico
  });
}

module.exports = { imprimirHTMLSilencioso };
