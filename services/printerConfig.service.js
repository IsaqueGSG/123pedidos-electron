const fs = require("fs");
const path = require("path");
const { app } = require("electron");

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

function salvarImpressora(nome) {
  const config = lerConfig();
  config.nome = nome;
  salvarConfig(config);
}

function getImpressoraSalva() {
  const config = lerConfig();
  return config.nome || null;
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

module.exports = {
  salvarImpressora,
  getImpressoraSalva,
  salvarLargura,
  getLarguraSalva
};