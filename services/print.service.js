const { BrowserWindow } = require("electron");

const { getImpressoraSalva } = require("./printerConfig.service");

async function imprimirHTMLSilencioso(html) {
  console.log("🧾 [PRINT] Pedido recebido");

  // ✅ garante CSS de impressão correto
  const htmlFinal = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          body {
            margin: 0;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

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

  // ✅ carrega página vazia
  await printWin.loadURL("about:blank");

  console.log("🧾 [PRINT] escrevendo HTML");

  // ✅ escreve HTML completo
  await printWin.webContents.executeJavaScript(`
    document.open();
    document.write(\`${htmlFinal.replace(/`/g, "\\`")}\`);
    document.close();
  `);

  // ✅ ESPERA O DOM + LAYOUT TERMINAR (correção principal)
  await printWin.webContents.executeJavaScript(`
    new Promise(resolve => {
      if (document.readyState === "complete") resolve();
      else window.onload = resolve;
    });
  `);

  try {
    console.log("🧾 [PRINT] buscando impressoras...");

    const printers = await printWin.webContents.getPrintersAsync();

    console.log(
      "🧾 [PRINT] impressoras encontradas:",
      printers.map(p => ({
        name: p.name,
        isDefault: p.isDefault
      }))
    );

    if (!printers.length) {
      console.log("❌ [PRINT] nenhuma impressora encontrada");
      printWin.close();
      return false;
    }

    const salva = getImpressoraSalva();

    const printer =
      printers.find(p => p.name === salva) ||
      printers.find(p => p.isDefault) ||
      printers[0];

    console.log("🧾 [PRINT] usando impressora:", printer.name);

    return await new Promise((resolve) => {
      printWin.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printer.name,
          scaleFactor: 100
        },
        (success, err) => {
          console.log("🧾 [PRINT] resultado:", success, err);
          printWin.close();
          resolve(success);
        }
      );
    });

  } catch (e) {
    console.log("❌ [PRINT] erro:", e);
    printWin.close();
    return false;
  }
}

module.exports = { imprimirHTMLSilencioso };
