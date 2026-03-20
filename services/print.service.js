const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { getImpressoraSalva } = require("./printerConfig.service");

/**
 * Envia buffer RAW para impressora compartilhada no Windows (CMD + copy /b)
 */
async function enviarRawWindows(buffer, printerName) {
  const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.bin`);

  try {
    // escreve arquivo temporário
    await fsPromises.writeFile(tempFile, buffer);

    // caminho da impressora (pode substituir os.hostname() por nome fixo)
    const caminho = `\\\\${os.hostname()}\\${printerName}`;

    return new Promise((resolve, reject) => {
      const child = spawn("cmd.exe", ["/c", `copy /b "${tempFile}" "${caminho}"`], {
        windowsHide: true,
        shell: true
      });

      let errorOutput = "";
      let output = "";

      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", async (code) => {
        // remove arquivo temporário
        try {
          await fsPromises.unlink(tempFile);
        } catch (err) {
          console.warn("Não foi possível remover arquivo temporário:", err.message);
        }

        if (code !== 0) {
          console.error("Erro print:", errorOutput || output);
          reject(new Error("Falha ao enviar para spooler"));
        } else {
          resolve({ success: true });
        }
      });
    });
  } catch (err) {
    // caso dê erro na escrita do arquivo temporário
    try {
      await fsPromises.unlink(tempFile);
    } catch { }
    throw err;
  }
}

function limparTexto(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "");
}

function quebrarLinha(texto, max) {
  const palavras = texto.split(" ");
  let linha = "";
  let resultado = "";

  for (const palavra of palavras) {
    if ((linha + palavra).length > max) {
      resultado += linha.trim() + "\n";
      linha = palavra + " ";
    } else {
      linha += palavra + " ";
    }
  }

  return resultado + linha.trim();
}

function gerarComandaESCPos(pedido, larguraMM = 80) {
  const ESC = "\x1B";
  const GS = "\x1D";

  const t = limparTexto;

  const charsPorLinha = larguraMM === 58 ? 32 : 48;
  const divider = "-".repeat(charsPorLinha) + "\n";

  let conteudo = "";

  // avanço inicial
  conteudo += "\n";

  // centralizado
  conteudo += ESC + "a" + "\x01";

  // Cabeçalho
  const data = pedido.createdAt?.seconds
    ? new Date(pedido.createdAt.seconds * 1000).toLocaleString("pt-BR")
    : new Date().toLocaleString("pt-BR");

  conteudo += ESC + "E" + "\x01";
  conteudo += quebrarLinha(t((pedido.cliente?.nome || "").toUpperCase()), charsPorLinha) + "\n";
  conteudo += ESC + "E" + "\x00";

  conteudo += quebrarLinha(t(pedido.cliente?.telefone || ""), charsPorLinha) + "\n";
  conteudo += quebrarLinha(t(data), charsPorLinha) + "\n";

  // ESQUERDA
  conteudo += ESC + "a" + "\x00";
  conteudo += divider;

  // ENTREGA
  conteudo += ESC + "E" + "\x01" + "Entrega:\n" + ESC + "E" + "\x00";

  const endereco = pedido.cliente?.endereco || {};

  if (pedido.retirarNaLoja) {
    conteudo += "Retirar na loja\n";
  } else {
    conteudo += quebrarLinha(
      `${t(endereco.rua || "")}, ${t(endereco.numero || "")}`,
      charsPorLinha
    ) + "\n";

    conteudo += quebrarLinha(
      `${t(endereco.bairro || "")} - ${t(endereco.cidade || "")}/${t(endereco.uf || "")}`,
      charsPorLinha
    ) + "\n";

    if (endereco.observacao) {
      conteudo += quebrarLinha(`Obs: ${t(endereco.observacao)}`, charsPorLinha) + "\n";
    }
  }

  conteudo += divider;

  // ITENS
  const itensPorTipo = pedido.itens.reduce((acc, item) => {
    const tipo = item.tipo || "Itens";
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(item);
    return acc;
  }, {});

  let subTotalItens = 0;

  Object.entries(itensPorTipo).forEach(([tipo, itens]) => {
    conteudo += ESC + "E" + "\x01";
    conteudo += t(tipo.toUpperCase()) + "\n";
    conteudo += ESC + "E" + "\x00";

    itens.forEach((item) => {
      subTotalItens += item.valor * (item.quantidade ?? 1);

      conteudo += ESC + "E" + "\x01";
      conteudo += quebrarLinha(`${item.quantidade}x ${t(item.nome)}`, charsPorLinha) + "\n";
      conteudo += ESC + "E" + "\x00";

      if (item.borda?.nome) {
        conteudo += "   " + quebrarLinha(`BORDA: ${t(item.borda.nome)}`, charsPorLinha) + "\n";
      }

      if (item.extras?.length) {
        conteudo += "   " + "EXTRAS:\n";

        item.extras.forEach(e => {
          conteudo += "   " + quebrarLinha(
            `-> ${t(e.nome)} (+${e.valor.toFixed(2)})`,
            charsPorLinha
          ) + "\n";
        });
      }

      if (item.observacao) {
        conteudo += "   " + quebrarLinha(`   OBS: ${t(item.observacao)}`, charsPorLinha) + "\n";
      }

      conteudo += "\n";
    });
  });

  conteudo += divider;

  // VALORES
  conteudo += "Valores:\n";
  conteudo += `Total dos itens: R$ ${subTotalItens.toFixed(2)}\n`;
  conteudo += `Taxa de entrega: R$ ${(endereco.taxaEntrega ?? 0).toFixed(2)}\n`;

  conteudo += divider;

  // PAGAMENTO
  const pagamento = pedido.cliente?.formaPagamento || {};
  conteudo += ESC + "E" + "\x01" + "Pagamento: " + ESC + "E" + "\x00";
  conteudo += t(pagamento.forma || "") + "\n";

  if (pagamento.forma === "DINHEIRO" && pagamento.obsPagamento) {
    conteudo += `Troco para: R$ ${t(pagamento.obsPagamento)}\n`;
  }

  // TOTAL DESTACADO
  conteudo += ESC + "a" + "\x02";
  conteudo += GS + "!" + "\x11";

  conteudo += `TOTAL: R$ ${(pedido.total ?? 0).toFixed(2)}\n`;

  conteudo += GS + "!" + "\x00";
  conteudo += ESC + "a" + "\x00";

  // AVANÇO + CORTE
  conteudo += "\n\n\n";
  conteudo += GS + "V" + "\x00";

  return Buffer.from(conteudo, "ascii");
}

/**
 * Imprime pedido ESC/POS
 */
async function imprimirPedidoPedidoObj(pedido, larguraMM = 80) {
  const printerName = getImpressoraSalva();
  if (!printerName) throw new Error("Nenhuma impressora configurada");

  if (![80, 58].includes(Number(larguraMM))) larguraMM = 80;

  const buffer = gerarComandaESCPos(pedido, larguraMM);

  return enviarRawWindows(buffer, printerName);
}

module.exports = {
  imprimirPedidoPedidoObj,
};
