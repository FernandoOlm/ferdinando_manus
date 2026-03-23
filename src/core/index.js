import fs from "fs";
import { config } from "../config/index.js";
import { connectToWhatsApp } from "./connection.js";
import { registerEventHandlers } from "./eventHandler.js";
import { startScheduler } from "./scheduler.js";
import { ensureAuthFile } from "../commands/auth.js";

// --------------------------------------------------------
// SISTEMA DE BOAS-VINDAS — JSON
// --------------------------------------------------------
function ensureBVFile() {
  if (!fs.existsSync(config.PATHS.BV)) {
    fs.writeFileSync(config.PATHS.BV, JSON.stringify({ grupos: {} }, null, 2));
  }
}

export function loadBV() {
  ensureBVFile();
  try {
    const raw = fs.readFileSync(config.PATHS.BV, "utf8").trim();
    if (!raw) throw new Error("empty");
    return JSON.parse(raw);
  } catch (e) {
    console.log("⚠ bv.json corrompido. Restaurando padrão...");
    const clean = { grupos: {} };
    fs.writeFileSync(config.PATHS.BV, JSON.stringify(clean, null, 2));
    return clean;
  }
}

export function saveBV(data) {
  fs.writeFileSync(config.PATHS.BV, JSON.stringify(data, null, 2));
}

export function criarBV(grupoId, mensagem) {
  if (!grupoId.endsWith("@g.us")) return false;
  const bv = loadBV();
  bv.grupos[grupoId] = {
    mensagem,
    ativo: true,
    atualizado: new Date().toISOString(),
  };
  saveBV(bv);
  return true;
}

export function ativarBV(grupoId) {
  const bv = loadBV();
  if (!bv.grupos[grupoId]) return false;
  bv.grupos[grupoId].ativo = true;
  saveBV(bv);
  return true;
}

export function desativarBV(grupoId) {
  const bv = loadBV();
  if (!bv.grupos[grupoId]) return false;
  bv.grupos[grupoId].ativo = false;
  saveBV(bv);
  return true;
}

export function lerBV(grupoId) {
  const bv = loadBV();
  return bv.grupos[grupoId] || null;
}

// --------------------------------------------------------
// INICIALIZAÇÃO DO BOT
// --------------------------------------------------------
async function startBot() {
  console.log("\x1b[36m🚀 Iniciando Ferdinando IA...\x1b[0m");
  
  // Garante arquivos essenciais
  ensureAuthFile();
  ensureBVFile();

  // Conecta ao WhatsApp
  const sock = await connectToWhatsApp();

  // Registra handlers de eventos
  registerEventHandlers(sock);

  // Inicia o agendador
  startScheduler(sock);
}

startBot().catch(err => {
  console.error("❌ Erro fatal na inicialização:", err.message);
  process.exit(1);
});
