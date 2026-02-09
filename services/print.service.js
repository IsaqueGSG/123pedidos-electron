const { BrowserWindow, app } = require("electron");
const fs = require("fs");
const path = require("path");
const { getImpressoraSalva } = require("./printerConfig.service");

// Função para obter o diretório solicitado
function getAuthDir() {
  const dir = path.join(app.getPath("userData"), "impressao");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function imprimirHTMLSilencioso(html, estilos, larguraMM = 80) {
  let win = null;

  // Validação da largura - CORREÇÃO AQUI
  if (![80, 58].includes(larguraMM)) {
    console.warn(`⚠️ Largura inválida: "${larguraMM}mm". Usando padrão 80mm.`);
    larguraMM = 80;
  }

  // Converter mm para microns (1mm = 1000 microns)
  const larguraMicrons = larguraMM * 1000;
  // Altura fixa ou calcular baseado no conteúdo
  const alturaMicrons = 297000; // 297mm (tamanho A4) - ajuste conforme necessário

  const printerName = getImpressoraSalva();
  const storageDir = getAuthDir();
  const filePath = path.join(storageDir, `pedido_${Date.now()}.html`);

  // Montagem do HTML Final
  const htmlFinal = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${estilos}
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  // Salva o arquivo
  fs.writeFileSync(filePath, htmlFinal, { encoding: "utf8" });

  win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  try {
    await win.loadFile(filePath);

    // Aguarda o carregamento
    await win.webContents.executeJavaScript(`
      new Promise(resolve => {
        if (document.readyState === "complete") {
          setTimeout(resolve, 100);
        } else {
          window.addEventListener('load', () => setTimeout(resolve, 100));
        }
      });
    `);

    // **CORREÇÃO PRINCIPAL AQUI** - pageSize precisa de height e width
    const printOptions = {
      silent: true,
      deviceName: printerName,
      printBackground: true,
      margins: { marginType: 'none' },
      pageSize: {
        width: larguraMicrons,
        height: alturaMicrons 
      },
      pageSizeOrientation: 'portrait', // ou 'landscape' se necessário
      copies: 1
    };

    console.log(`🖨️ Imprimindo ${larguraMM}mm na impressora: ${printerName || 'Padrão'}`);
    console.log(`📏 Tamanho da página: ${larguraMicrons}x${alturaMicrons} microns`);

    // Uso do método nativo
    await win.webContents.print(printOptions);
    console.log(`✅ Impressão ${larguraMM}mm enviada com sucesso.`);

    return { 
      success: true, 
      message: `Impressão ${larguraMM}mm enviada`,
      larguraUtilizada: larguraMM 
    };

  } catch (error) {
    console.error("❌ Erro na impressão nativa:", error);

    // Tenta fallback com opções mais simples
    console.log("🔄 Tentando fallback com opções mais simples...");
    try {
      await win.webContents.print({
        silent: true,
        deviceName: printerName,
        printBackground: true,
        margins: { marginType: 'none' }
      });
      console.log("✅ Impressão fallback bem-sucedida.");
      return { 
        success: true, 
        message: "Impressão fallback enviada",
        larguraUtilizada: larguraMM 
      };
    } catch (fallbackError) {
      console.error("❌ Erro no fallback também:", fallbackError);
      return {
        success: false,
        error: fallbackError.message,
        larguraUtilizada: larguraMM
      };
    }
  } finally {
    // Cleanup
    setTimeout(() => {
      if (win && !win.isDestroyed()) {
        win.close();
        win.destroy();
        win = null;
      }

      // Deletar arquivo temporário
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🧹 Arquivo temporário removido: ${filePath}`);
        }
      } catch (e) {
        console.warn("⚠️ Não foi possível deletar o arquivo temporário:", e);
      }
    }, 2000);
  }
}

module.exports = { imprimirHTMLSilencioso };