import { botLoggerRegisterEvent_Unique01 } from "../utils/logger.js";
import { atualizarGrupo_Unique03 } from "../utils/groups.js";
import { banCheckEntrada_Unique01 } from "../commands/ban.js";
import { lerBV } from "./index.js"; // Temporário até refatorar index.js completamente
import { clawBrainProcess_Unique01 } from "./clawBrain.js";
import { config } from "../config/index.js";

/**
 * Registra todos os handlers de eventos para o socket.
 * @param {Object} sock - A instância do socket do Baileys.
 */
export function registerEventHandlers(sock) {
  // Evento de participantes do grupo (Entrada/Saída)
  sock.ev.on("group-participants.update", async (update) => {
    if (update.action !== "add") return;

    const grupoId = update.id;
    const bvConfig = lerBV(grupoId);

    if (!bvConfig || !bvConfig.ativo) return;

    for (const usuario of update.participants) {
      try {
        const numero = usuario.replace(/@.*/, "");

        // 1) Banimento automático
        const banDetectado = await banCheckEntrada_Unique01(sock, grupoId, usuario);
        if (banDetectado) continue;

        // 2) Boas-vindas
        await sock.sendMessage(grupoId, {
          text: `👋 Olá @${numero}!\n\n${bvConfig.mensagem}`,
          mentions: [usuario],
        });
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

    // Atualiza metadados do grupo se necessário
    if (isGroup) {
      await atualizarGrupo_Unique03(sock, jid);
    }

    // Registra log da mensagem
    try {
      botLoggerRegisterEvent_Unique01(msg);
    } catch (e) {
      console.error("❌ Erro ao salvar log:", e.message);
    }

    // Processamento de IA e Comandos (será expandido no commandHandler)
    try {
      const resposta = await clawBrainProcess_Unique01(msg);
      if (resposta && typeof resposta === "string") {
        await sock.sendMessage(jid, { text: resposta });
      }
    } catch (e) {
      console.error("❌ Erro no processamento da mensagem:", e.message);
    }
  });
}
