const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { getImpressoraSalva } = require("./printerConfig.service");

/**
 * Envia buffer RAW para impressora compartilhada no Windows (CMD + copy /b)
 */
function enviarRawWindows(buffer, printerName) {
  return new Promise((resolve, reject) => {
    try {
      const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.bin`);
      fs.writeFileSync(tempFile, buffer);

      // comando CMD com copy /b
      const caminho = `\\\\${os.hostname()}\\${printerName}`;

      // usar spawn com shell: true e escapar as aspas
      const child = spawn("cmd.exe", ["/c", `copy /b "${tempFile}" "${caminho}"`], {
        windowsHide: true,
        shell: true
      });


      let errorOutput = "";
      child.stderr.on("data", data => {
        errorOutput += data.toString();
      });

      child.on("close", code => {
        fs.unlink(tempFile, () => { }); // remove arquivo temporário

        if (code !== 0) {
          console.log("Erro print:", errorOutput);
          reject(new Error("Falha ao enviar para spooler"));
        } else {
          resolve({ success: true });
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

function gerarComandaESCPos(pedido, larguraMM) {
  const ESC = "\x1B";
  const GS = "\x1D";

  let conteudo = "";
  const divider = larguraMM === 58
    ? "--------------------------------\n"
    : "------------------------------------------------\n";

  conteudo += ESC + "@"; // init
  conteudo += ESC + "a" + "\x01"; // centralizado
  conteudo += ESC + "E" + "\x01"; // bold on
  conteudo += "NOVO PEDIDO\n";
  conteudo += ESC + "E" + "\x00"; // bold off
  conteudo += divider;

  conteudo += ESC + "a" + "\x00"; // esquerda
  conteudo += `Pedido: ${pedido.id}\n`;
  conteudo += `Cliente: ${pedido.cliente?.nome || ""}\n`;
  conteudo += `Telefone: ${pedido.cliente?.telefone || ""}\n`;
  conteudo += divider;

  pedido.itens.forEach(item => {
    conteudo += ESC + "E" + "\x01";
    conteudo += `${item.quantidade}x ${item.nome}\n`;
    conteudo += ESC + "E" + "\x00";

    if (item.observacao)
      conteudo += `Obs: ${item.observacao}\n`;

    conteudo += `R$ ${item.valor.toFixed(2)}\n\n`;
  });

  conteudo += divider;
  conteudo += ESC + "E" + "\x01";
  conteudo += `TOTAL: R$ ${pedido.total.toFixed(2)}\n`;
  conteudo += ESC + "E" + "\x00";

  conteudo += "\nObrigado pela preferência!\n\n\n";
  conteudo += GS + "V" + "\x00"; // corte

  return Buffer.from(conteudo, "latin1");
}

async function imprimirPedidoPedidoObj(pedido, larguraMM = 80) {
  const printerName = getImpressoraSalva();
  if (!printerName) throw new Error("Nenhuma impressora configurada");

  if (![80, 58].includes(Number(larguraMM))) larguraMM = 80;

  const buffer = gerarComandaESCPos(pedido, larguraMM);

  return enviarRawWindows(buffer, printerName);
}

module.exports = {
  imprimirPedidoPedidoObj
};
