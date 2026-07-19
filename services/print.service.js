const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { app } = require("electron");
const { exec } = require("child_process");


/**
 * Envia buffer RAW para impressora compartilhada no Windows (CMD + copy /b)
 */
async function enviarRawWindows(buffer, printer) {
  const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.bin`);

  try {
    // escreve arquivo temporário
    await fsPromises.writeFile(tempFile, buffer);

    // caminho da impressora (pode substituir os.hostname() por nome fixo)
    if (!printer?.shareName) {
      throw new Error(
        "A impressora selecionada não possui compartilhamento configurado."
      );
    }

    const caminho = `\\\\${os.hostname()}\\${printer.shareName}`;

    console.log("Imprimindo em:", caminho);

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

function obterCategoriaItem(item) {

  // 1️⃣ Campo direto (mais confiável)
  if (item.categoriaNome?.trim()) {
    return item.categoriaNome.trim();
  }

  // 2️⃣ Categoria dentro do objeto categoria
  if (item.categoria?.nome?.trim()) {
    return item.categoria.nome.trim();
  }

  // 3️⃣ Pizza mista → pegar categoria do primeiro sabor
  if (item.sabores?.length) {
    const nome = item.sabores[0]?.categoria?.nome;
    if (nome?.trim()) return nome.trim();
  }

  // 4️⃣ Fallbacks
  if (item.tipo?.trim()) return item.tipo.trim();

  return "Itens";
}


function gerarComandaESCPos(pedido, larguraMM = 80, numComanda) {
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

  // VOLTA PRA ESQUERDA
  conteudo += ESC + "a" + "\x00";

  // === LINHA 1: NOME + #COMANDA ===
  const nome = t((pedido.cliente?.nome || "").toUpperCase());
  const numero = numComanda ? `#${numComanda}` : "";

  // espaço disponível entre nome e número
  const espaco = charsPorLinha - nome.length - numero.length;

  // evita quebrar se for muito grande
  const linhaNomeNumero =
    nome.length + numero.length >= charsPorLinha
      ? nome + "\n" + numero
      : nome + " ".repeat(Math.max(1, espaco)) + numero;

  conteudo += ESC + "E" + "\x01";
  conteudo += quebrarLinha(linhaNomeNumero, charsPorLinha) + "\n";
  conteudo += ESC + "E" + "\x00";

  conteudo += quebrarLinha(t(pedido.cliente?.telefone || ""), charsPorLinha) + "\n";
  conteudo += quebrarLinha(t(data), charsPorLinha) + "\n";

  // ESQUERDA
  conteudo += ESC + "a" + "\x00";
  conteudo += divider;

  // ENTREGA
  conteudo += ESC + "E" + "\x01" + "Entrega: " + ESC + "E" + "\x00";

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
  const itensPorCategoria = pedido.itens.reduce((acc, item) => {
    const categoria = obterCategoriaItem(item);

    if (!acc[categoria]) acc[categoria] = [];
    acc[categoria].push(item);

    return acc;
  }, {});

  let subTotalItens = 0;

  Object.entries(itensPorCategoria).forEach(([categoria, itens]) => {
    conteudo += ESC + "E" + "\x01";
    conteudo += t(categoria.toUpperCase()) + "\n";
    conteudo += ESC + "E" + "\x00";

    itens.forEach((item) => {
      subTotalItens += item.valor * (item.quantidade ?? 1);

      conteudo += ESC + "E" + "\x01";
      conteudo += quebrarLinha(`${item.quantidade}x ${t(item.nome)}`, charsPorLinha) + "\n";
      conteudo += ESC + "E" + "\x00";

      if (item.selecoes && Object.keys(item.selecoes).length > 0) {

        Object.entries(item.selecoes).forEach(([grupoId, grupo]) => {
          conteudo += `   ${grupo.nome.toUpperCase()}:\n`;

          grupo.itens.forEach(e => {
            conteudo +=
              "   " +
              quebrarLinha(
                `-> ${t(e.nome)} (+${e.valor.toFixed(2)})`,
                charsPorLinha
              ) +
              "\n";
          });
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

  // TOTAL DESTACADO
  conteudo += ESC + "a" + "\x02";
  conteudo += GS + "!" + "\x11";

  const pagamento = pedido.cliente?.formaPagamento || {};
  const total = Number(pedido.total || 0);

  conteudo += `${pagamento.forma}: R$ ${total.toFixed(2)}\n`;

  conteudo += GS + "!" + "\x00";  // VOLTA TAMANHO NORMAL
  conteudo += ESC + "a" + "\x00";  // ALINHAMENTO ESQUERDA

  // TROCO (se dinheiro)
  if (pagamento.forma === "DINHEIRO" && pagamento.obsPagamento) {
    const recebe = Number(
      pagamento.obsPagamento.toString().replace(",", ".")
    );
    const troco = recebe - total;

    conteudo += "\n";
    conteudo += `Recebe: R$ ${recebe.toFixed(2)} e devolve R$ ${troco.toFixed(2)}`;
  }

  // AVANÇO + CORTE
  conteudo += "\n\n\n";
  conteudo += GS + "V" + "\x00";

  return Buffer.from(conteudo, "ascii");
}

/**
 * Imprime pedido ESC/POS
 */
async function imprimirPedidoPedidoObj(
  pedido,
  larguraMM = 80,
  numComanda,
  printerTeste = null
) {

  const printer =
    printerTeste || getImpressoraSalva();
    
  if (!printer) throw new Error("Nenhuma impressora configurada");

  if (![80, 58].includes(Number(larguraMM))) larguraMM = 80;

  const buffer = gerarComandaESCPos(pedido, larguraMM, numComanda);

  return enviarRawWindows(buffer, printer);
}

function getConfigPath() {
  return path.join(app.getPath("userData"), "printer.json");
}

function lerConfig() {
  const p = getConfigPath();

  if (!fs.existsSync(p)) return {};

  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

function salvarConfig(config) {
  fs.writeFileSync(
    getConfigPath(),
    JSON.stringify(config, null, 2),
    "utf-8"
  );
}

function salvarImpressora(printer) {
  const config = lerConfig();
  config.printer = printer;
  salvarConfig(config);
}

function getImpressoraSalva() {
  const config = lerConfig();
  return config.printer || null;
}

function salvarLargura(largura) {
  const config = lerConfig();
  config.largura = largura;
  salvarConfig(config);
}

function getLarguraSalva() {
  const config = lerConfig();
  return config.largura || "80mm"; // default
}

// Função para verificar status real da impressora
function verificarImpressoraCompartilhada(nomeImpressora) {
  return new Promise((resolve) => {
    // O comando abaixo lista as impressoras e seu status de compartilhamento
    const command = `powershell "Get-Printer | Where-Object { $_.Name -eq '${nomeImpressora}' } | Select-Object -ExpandProperty Shared"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error || stderr) {
        resolve(false); // Assume falso se houver erro na consulta
        return;
      }
      // O PowerShell retorna 'True' ou 'False' (com quebras de linha)
      resolve(stdout.trim().toLowerCase() === 'true');
    });
  });
}

module.exports = {
  salvarImpressora,
  getImpressoraSalva,
  salvarLargura,
  getLarguraSalva,
  imprimirPedidoPedidoObj,
  verificarImpressoraCompartilhada
};
