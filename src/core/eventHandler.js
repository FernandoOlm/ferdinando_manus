import { botLoggerRegisterEvent_Unique01 } from "../utils/logger.js";
import { atualizarGrupo_Unique03 } from "../utils/groups.js";
import { banCheckEntrada_Unique01 } from "../commands/ban.js";
import { lerBV } from "./index.js";
import { clawBrainProcess_Unique01 } from "./clawBrain.js";
import { handleCommand } from "./commandHandler.js";
import { config } from "../config/index.js";
import { registerPoll, registerVote } from "../commands/leilao.js";

// Fila de mensagens para comportamento humano
const messageQueue = new Map();

/**
 * Simula o comportamento humano de digitação e delay.
 */
async function sendHumanizedMessage(sock, jid, text) {
  if (!text) return;
  await sock.sendPresenceUpdate("composing", jid);
  const typingTime = Math.min(
    text.length * config.HUMAN_BEHAVIOR.TYPING_SPEED,
    config.HUMAN_BEHAVIOR.MAX_DELAY
  );
  await new Promise((resolve) => setTimeout(resolve, typingTime));
  await sock.sendPresenceUpdate("paused", jid);
  await sock.sendMessage(jid, { text });
}

/**
 * Registra todos os handlers de eventos para o socket.
 */
export function registerEventHandlers(sock) {
  // Evento de participantes do grupo
  sock.ev.on("group-participants.update", async (update) => {
    if (update.action !== "add") return;
    const grupoId = update.id;
    const bvConfig = lerBV(grupoId);
    if (!bvConfig || !bvConfig.ativo) return;
    for (const usuario of update.participants) {
      try {
        const numero = usuario.replace(/@.*/, "");
        const banDetectado = await banCheckEntrada_Unique01(sock, grupoId, usuario);
        if (banDetectado) continue;
        await sendHumanizedMessage(sock, grupoId, `👋 Olá @${numero}!\n\n${bvConfig.mensagem}`);
      } catch (e) {
        console.error("❌ Erro ao processar entrada no grupo:", e.message);
      }
    }
  });

  // Evento de votos em enquetes
  sock.ev.on("messages.update", async (updates) => {
    for (const update of updates) {
      if (update.update.pollUpdates) {
        const pollUpdate = update.update.pollUpdates[0];
        const pollCreationId = update.key.id;
        const voterJid = pollUpdate.voterJid;
        
        console.log(`🗳️ [LEILÃO] Voto recebido de ${voterJid} na enquete ${pollCreationId}`);
        
        if (pollUpdate.vote && pollUpdate.vote.selectedOptions) {
          registerVote(pollCreationId, voterJid, pollUpdate.vote.selectedOptions);
        }
      }
    }
  });

  // Evento de novas mensagens
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith("@g.us");
    const pushName = msg.pushName || "Usuário";
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNumber = sender.replace(/@.*/, "");

    // --- DETECÇÃO PROFUNDA DE ENQUETE ---
    // Procura em qualquer lugar da estrutura da mensagem por pollCreationMessage
    const findPoll = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.pollCreationMessage || obj.pollCreationMessageV2 || obj.pollCreationMessageV3) {
        return obj.pollCreationMessage || obj.pollCreationMessageV2 || obj.pollCreationMessageV3;
      }
      for (const key in obj) {
        const found = findPoll(obj[key]);
        if (found) return found;
      }
      return null;
    };

    const pollCreation = findPoll(msg.message);

    if (pollCreation) {
      console.log(`📝 [LEILÃO] Enquete detectada via Deep Scan: ${pollCreation.name}`);
      const pollName = pollCreation.name;
      const options = pollCreation.options?.map(o => o.optionName) || [];
      registerPoll(msg.key.id, jid, pollName, options);
    }
    // ------------------------------------

    // Trata diferentes tipos de mensagens para texto
    const text = msg.message.conversation || 
                 msg.message.extendedTextMessage?.text || 
                 (msg.message.imageMessage ? "[Imagem]" : 
                  pollCreation ? `[Enquete: ${pollCreation.name}]` : 
                  "[Mídia]");

    // Log visual no console (limpo)
    const typeLabel = isGroup ? "\x1b[35m[GRUPO]\x1b[0m" : "\x1b[32m[PV]\x1b[0m";
    console.log(`${typeLabel} \x1b[36m${pushName} (${senderNumber}):\x1b[0m ${text}`);

    if (isGroup) await atualizarGrupo_Unique03(sock, jid);

    try {
      botLoggerRegisterEvent_Unique01(msg);
    } catch (e) {}

    // 1. VERIFICA SE É COMANDO TÉCNICO (PRIORIDADE)
    const isCommand = text.startsWith("!") || text.startsWith("/");
    if (isCommand) {
      const commandResult = await handleCommand(sock, msg, text);
      if (commandResult) {
        await sendHumanizedMessage(sock, jid, commandResult);
        return; 
      }
    }

    // 2. LÓGICA DE RESPOSTA IA HUMANIZADA
    const botNumber = sock.user.id.split(":")[0];
    const isMentioned = text.includes(`@${botNumber}`) || 
                        msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.includes(botNumber + "@s.whatsapp.net");

    if (!isGroup || isMentioned) {
      if (messageQueue.has(jid)) {
        clearTimeout(messageQueue.get(jid).timeout);
        const currentData = messageQueue.get(jid);
        currentData.messages.push(text);
        currentData.lastMsg = msg;
      } else {
        messageQueue.set(jid, {
          messages: [text],
          lastMsg: msg,
          timeout: null
        });
      }

      const queueData = messageQueue.get(jid);
      queueData.timeout = setTimeout(async () => {
        try {
          const fullText = queueData.messages.join(" ");
          messageQueue.delete(jid);

          const consolidatedMsg = { ...queueData.lastMsg };
          if (consolidatedMsg.message.conversation) {
            consolidatedMsg.message.conversation = fullText;
          } else if (consolidatedMsg.message.extendedTextMessage) {
            consolidatedMsg.message.extendedTextMessage.text = fullText;
          }

          const resposta = await clawBrainProcess_Unique01(consolidatedMsg);
          if (resposta && typeof resposta === "string") {
            await sendHumanizedMessage(sock, jid, resposta);
          }
        } catch (e) {
          console.error("❌ Erro no processamento humanizado:", e.message);
          messageQueue.delete(jid);
        }
      }, config.HUMAN_BEHAVIOR.WAIT_FOR_MORE_MS);
    }
  });
}
