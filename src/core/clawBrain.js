import fs from "fs";
import { aiGenerateReply } from "./aiClient.js";
import { executarAcoesAutomaticas_Unique01 } from "../actions/index.js";
import { setFriend } from "./friendManager.js";
import { config } from "../config/index.js";

/**
 * Limpa e compacta a resposta da IA para evitar problemas de formatação no WhatsApp.
 * @param {string} text - O texto a ser compactado.
 * @returns {string} - O texto limpo.
 */
function compactResponse(text) {
  if (!text) return "";
  return text
    .replace(/@\d+/g, "")
    .replace(/<@\d+>/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifica restrições em conversas privadas (PV).
 * @param {Object} msgObj - O objeto da mensagem.
 * @returns {Promise<string|null>} - Mensagem de erro ou null se permitido.
 */
async function checkPVSecurity(msgObj) {
  const jid = msgObj?.key?.remoteJid;
  if (!jid || jid.endsWith("@g.us")) return null;

  const raw = msgObj?.key?.participant || jid;
  const fromClean = raw.replace(/@.*/, "");

  if (fs.existsSync(config.PATHS.BANS)) {
    const bansDB = JSON.parse(fs.readFileSync(config.PATHS.BANS, "utf8"));
    const isBanned = bansDB.global?.some(b => b.alvo === fromClean);

    if (isBanned) {
      return "Seu acesso foi bloqueado. Contate a administração.";
    }
  }

  const text = (msgObj?.message?.conversation || msgObj?.message?.extendedTextMessage?.text || "").toLowerCase();
  if (text.includes("sou de menor")) {
    return "Protocolo de segurança ativado. Acesso restrito.";
  }

  return null;
}

/**
 * Processa uma conversa normal através da IA.
 * @param {Object} msgObj - O objeto da mensagem.
 * @returns {Promise<string>} - A resposta gerada.
 */
async function processNormalAI(msgObj) {
  const text = msgObj?.message?.conversation || msgObj?.message?.extendedTextMessage?.text || "";
  const jid = msgObj?.key?.remoteJid;

  if (!jid || !text) return "";

  // Registro de amizade
  if (text.toLowerCase().includes("amigo")) {
    setFriend(jid);
    return "Registro confirmado! Agora somos parças. 🤙";
  }

  // Ações automáticas (ex: preços, enquetes)
  const autoAction = await executarAcoesAutomaticas_Unique01(text, jid);
  if (autoAction) return compactResponse(autoAction);

  // Resposta da IA (PASSANDO O JID PARA MANTER O HISTÓRICO)
  const reply = await aiGenerateReply(text, jid);
  return compactResponse(reply);
}

/**
 * Processador central de inteligência do bot.
 * @param {Object} msgObj - O objeto da mensagem.
 * @returns {Promise<string>} - A resposta final a ser enviada.
 */
export async function clawBrainProcess(msgObj) {
  // 1. Segurança em PV
  const pvSecurityMsg = await checkPVSecurity(msgObj);
  if (pvSecurityMsg) return pvSecurityMsg;

  // 2. Tratamento de Comandos (se vierem marcados como tal)
  if (msgObj?.tipo === "comando" && msgObj?.comando) {
    const dados = msgObj?.dados || {};
    if (typeof dados === "string") return dados;
    return dados.mensagem || dados.texto || dados.anuncioIA || dados.despedida || "Comando executado com sucesso.";
  }

  // 3. Conversa normal
  return await processNormalAI(msgObj);
}

// Alias para compatibilidade
export const clawBrainProcess_Unique01 = clawBrainProcess;
