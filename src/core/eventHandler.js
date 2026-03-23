import { botLoggerRegisterEvent_Unique01 } from "../utils/logger.js";
import { atualizarGrupo_Unique03 } from "../utils/groups.js";
import { banCheckEntrada_Unique01 } from "../commands/ban.js";
import { lerBV } from "./index.js";
import { clawBrainProcess_Unique01 } from "./clawBrain.js";
import { config } from "../config/index.js";

// Fila de mensagens para comportamento humano
const messageQueue = new Map();

/**
 * Simula o comportamento humano de digitação e delay.
 * @param {Object} sock - A instância do socket.
 * @param {string} jid - O ID do chat.
 * @param {string} text - O texto a ser enviado.
 * @param {Object} quoted - A mensagem que está sendo respondida.
 */
async function sendHumanizedMessage(sock, jid, text, quoted) {
  if (!text) return;

  // 1. Simula "digitando..."
  await sock.sendPresenceUpdate("composing", jid);

  // 2. Calcula tempo de digitação baseado no tamanho do texto
  const typingTime = Math.min(
    text.length * config.HUMAN_BEHAVIOR.TYPING_SPEED,
    config.HUMAN_BEHAVIOR.MAX_DELAY
  );
  
  await new Promise((resolve) => setTimeout(resolve, typingTime));

  // 3. Para de digitar e envia
  await sock.sendPresenceUpdate("paused", jid);
  await sock.sendMessage(jid, { text }, { quoted });
}

/**
 * Registra todos os handlers de eventos para o socket.
 * @param {Object} sock - A instância do socket do Baileys.
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

        // Boas-vindas humanizada
        await sendHumanizedMessage(sock, grupoId, `👋 Olá @${numero}!\n\n${bvConfig.mensagem}`, null);
      } catch (e) {
        console.error("❌ Erro ao processar entrada no grupo:", e.message);
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

    const text = msg.message.conversation || 
                 msg.message.extendedTextMessage?.text || 
                 (msg.message.imageMessage ? "[Imagem]" : "[Mídia]");

    // Log visual no console
    const typeLabel = isGroup ? "\x1b[35m[GRUPO]\x1b[0m" : "\x1b[32m[PV]\x1b[0m";
    console.log(`${typeLabel} \x1b[36m${pushName} (${senderNumber}):\x1b[0m ${text}`);

    if (isGroup) await atualizarGrupo_Unique03(sock, jid);

    try {
      botLoggerRegisterEvent_Unique01(msg);
    } catch (e) {
      console.error("❌ Erro ao salvar log:", e.message);
    }

    // Lógica de resposta humanizada
    const botNumber = sock.user.id.split(":")[0];
    const isMentioned = text.includes(`@${botNumber}`) || 
                        msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.includes(botNumber + "@s.whatsapp.net");
    const isCommand = text.startsWith("!") || text.startsWith("/");

    if (!isGroup || isMentioned || isCommand) {
      // Gerenciamento de fila para esperar o usuário terminar de digitar
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

      // Define o timeout para processar a resposta
      const queueData = messageQueue.get(jid);
      queueData.timeout = setTimeout(async () => {
        try {
          const fullText = queueData.messages.join(" ");
          messageQueue.delete(jid); // Limpa a fila antes de processar

          // Prepara o objeto de mensagem consolidado para a IA
          const consolidatedMsg = { ...queueData.lastMsg };
          if (consolidatedMsg.message.conversation) {
            consolidatedMsg.message.conversation = fullText;
          } else if (consolidatedMsg.message.extendedTextMessage) {
            consolidatedMsg.message.extendedTextMessage.text = fullText;
          }

          const resposta = await clawBrainProcess_Unique01(consolidatedMsg);
          if (resposta && typeof resposta === "string") {
            await sendHumanizedMessage(sock, jid, resposta, queueData.lastMsg);
          }
        } catch (e) {
          console.error("❌ Erro no processamento humanizado:", e.message);
          messageQueue.delete(jid);
        }
      }, config.HUMAN_BEHAVIOR.WAIT_FOR_MORE_MS);
    }
  });
}
