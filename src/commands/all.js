import fs from "fs";
import path from "path";
import { config } from "../config/index.js";

/**
 * Normaliza o ID do usuário para comparação.
 */
function normalizeId(raw) {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.length > 15) digits = digits.slice(-15);
  return digits;
}

/**
 * Comando !all - Marca todos os membros do grupo.
 */
export async function comandoAll(msg, sock, fromClean, args) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith("@g.us")) {
    return "Esse comando só funciona em grupos, mano. 🏢";
  }

  try {
    // 1. Buscar membros do grupo
    const metadata = await sock.groupMetadata(jid);
    const participants = metadata.participants.map(p => p.id);

    // 2. Verificar permissão (Admin do grupo ou ROOT)
    const senderNumber = normalizeId(fromClean);
    const isAdmin = metadata.participants.some(
      p => normalizeId(p.id) === senderNumber && (p.admin === "admin" || p.admin === "superadmin")
    );
    const isRoot = senderNumber === config.ROOT_ID.replace(/@.*/, "");

    // Também verifica no arquivo de autorizados como fallback
    let isAuthorized = false;
    try {
      if (fs.existsSync(config.PATHS.AUTH)) {
        const authDB = JSON.parse(fs.readFileSync(config.PATHS.AUTH, "utf8"));
        isAuthorized = authDB.grupos[jid]?.autorizados?.includes(senderNumber);
      }
    } catch (e) {}

    if (!isAdmin && !isRoot && !isAuthorized) {
      return "Só os admins ou autorizados podem chamar a galera toda, blz? 🚫";
    }

    // 3. Preparar a mensagem
    const textArg = Array.isArray(args) ? args.join(" ").trim() : "";
    const messageText = textArg.length > 0 ? textArg : "🔔 Atenção geral aqui!";

    // 4. Enviar as mensagens (Ping + Mensagem)
    // Primeiro um ping discreto
    await sock.sendMessage(jid, { text: "📣 *CHAMADA GERAL* 📣", mentions: participants });
    
    // Depois a mensagem real
    await sock.sendMessage(jid, { 
      text: `📢 ${messageText}`, 
      mentions: participants 
    });

    return { status: "ok", total: participants.length };
  } catch (e) {
    console.error("❌ Erro no comando !all:", e.message);
    return "Deu um erro aqui ao tentar chamar todo mundo... 😵";
  }
}
