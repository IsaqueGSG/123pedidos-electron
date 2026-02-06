const { BrowserWindow } = require("electron");

const { getImpressoraSalva } = require("./printerConfig.service");


async function imprimirHTMLSilencioso(html, larguraRaw = "80mm") {
  console.log("🧾 [PRINT] Pedido recebido");

  const larguraMicrons = parseInt(larguraRaw) * 1000;

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

  // ✅ em vez de about:blank + document.write
  const dataUrl =
    "data:text/html;charset=utf-8," +
    encodeURIComponent(htmlFinal);

  await printWin.loadURL(dataUrl);

  // ✅ espera render real
  await printWin.webContents.executeJavaScript(`
  new Promise(resolve => {
    if (document.readyState === "complete") resolve();
    else window.onload = resolve;
  });
`);

  await new Promise(r => setTimeout(r, 500));

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
          scaleFactor: 100,
          pageSize: {
            width: larguraMicrons,
            height: 300000 // Altura grande para não cortar comandas longas
          },
          margins: {
            marginType: "none"
          }
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
