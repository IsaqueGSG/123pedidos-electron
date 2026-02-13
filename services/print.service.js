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

/**
 * Gera buffer ESC/POS do pedido
 */
/**
 * Gera buffer ESC/POS baseado na estrutura de dados do Front-end
 */
function gerarComandaESCPos(pedido, larguraMM = 80) {
  const ESC = "\x1B";
  const GS = "\x1D";

  let conteudo = "";
  const is58 = larguraMM === 58;
  const divider = is58
    ? "--------------------------------\n"
    : "------------------------------------------------\n";

  // 1. Inicialização
  conteudo += ESC + "@";
  conteudo += ESC + "a" + "\x01"; // Centralizar cabeçalho

  // 2. Cabeçalho (Nome, Telefone, Data)
  const data = pedido.createdAt?.seconds
    ? new Date(pedido.createdAt.seconds * 1000).toLocaleString("pt-BR")
    : new Date().toLocaleString("pt-BR");

  conteudo += ESC + "E" + "\x01"; // Negrito ON
  conteudo += `${(pedido.cliente?.nome || "").toUpperCase()}\n`;
  conteudo += ESC + "E" + "\x00"; // Negrito OFF
  conteudo += `${pedido.cliente?.telefone || ""}\n`;
  conteudo += `${data}\n`;

  conteudo += ESC + "a" + "\x00"; // Alinhamento à esquerda
  conteudo += divider;

  // 3. Entrega
  const endereco = pedido.cliente?.endereco || {};
  conteudo += ESC + "E" + "\x01" + "Entrega:\n" + ESC + "E" + "\x00";
  conteudo += `${endereco.rua || ""}, ${endereco.numero || ""}\n`;
  conteudo += `${endereco.bairro || ""} - ${endereco.cidade || ""}/${endereco.uf || ""}\n`;

  if (endereco.observacao) {
    conteudo += `Obs: ${endereco.observacao}\n`;
  }
  conteudo += divider;

  // 4. Itens (Agrupados por tipo como no HTML)
  const itensPorTipo = pedido.itens.reduce((acc, item) => {
    const tipo = item.tipo || "Itens";
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(item);
    return acc;
  }, {});

  let subTotalItens = 0;

  Object.entries(itensPorTipo).forEach(([tipo, itens]) => {
    conteudo += ESC + "E" + "\x01" + `${tipo.toUpperCase()}\n` + ESC + "E" + "\x00";

    itens.forEach((item) => {
      subTotalItens += item.valor * (item.quantidade ?? 1);

      // Linha do produto em negrito
      conteudo += ESC + "E" + "\x01";
      conteudo += `${item.quantidade}x ${item.nome}\n`;
      conteudo += ESC + "E" + "\x00";

      // Detalhes extras (Borda, Extras, Obs)
      if (item.borda?.nome) conteudo += `  Borda: ${item.borda.nome}\n`;
      if (item.extras?.length) {
        const extrasStr = item.extras.map(e => e.nome).join(", ");
        conteudo += `  Extras: ${extrasStr}\n`;
      }
      if (item.observacao) conteudo += `  Obs: ${item.observacao}\n`;

      conteudo += "\n";
    });
  });
  conteudo += divider;

  // 5. Pagamento
  const pagamento = pedido.cliente?.formaPagamento || {};
  conteudo += ESC + "E" + "\x01" + "Pagamento:\n" + ESC + "E" + "\x00";
  conteudo += `${pagamento.forma || ""}\n`;

  if (pagamento.forma === "DINHEIRO" && pagamento.obsPagamento) {
    conteudo += `Troco para: R$ ${pagamento.obsPagamento}\n`;
  }
  conteudo += divider;

  // 6. Valores e Total
  conteudo += "Valores:\n";
  conteudo += `Total dos itens: R$ ${subTotalItens.toFixed(2)}\n`;
  conteudo += `Taxa de entrega: R$ ${(endereco.taxaEntrega ?? 0).toFixed(2)}\n`;

  conteudo += ESC + "a" + "\x02"; // Alinhar à direita para o Total
  conteudo += ESC + "E" + "\x01"; // Negrito
  conteudo += `TOTAL: R$ ${pedido.total.toFixed(2)}\n`;
  conteudo += ESC + "E" + "\x00";

  // 7. Rodapé
  conteudo += "\n";
  conteudo += ESC + "a" + "\x01"; // Centralizar
  conteudo += "Obrigado pela preferência\n\n\n";

  // Corte de papel
  conteudo += GS + "V" + "\x00";

  return Buffer.from(conteudo, "latin1");
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
