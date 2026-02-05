const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function getConfigPath() {
  return path.join(app.getPath("userData"), "printer.json");
}

function salvarImpressora(nome) {
  fs.writeFileSync(
    getConfigPath(),
    JSON.stringify({ nome }),
    "utf-8"
  );
}

function getImpressoraSalva() {
  const p = getConfigPath();

  if (!fs.existsSync(p)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    return data.nome || null;
  } catch {
    return null;
  }
}

module.exports = {
  salvarImpressora,
  getImpressoraSalva
};
