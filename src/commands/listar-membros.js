/**
 * Comando !listar-membros - Lista todos os participantes do grupo.
 */
export async function comandoListarMembros(msg, sock) {
  const jid = msg.key.remoteJid;

  if (!jid.endsWith("@g.us")) {
    return "Esse comando só funciona em grupos, mano. 🏢";
  }

  try {
    const metadata = await sock.groupMetadata(jid);
    const participants = metadata.participants;

    if (!participants || participants.length === 0) {
      return "Não achei ninguém nesse grupo... estranho, né? 🤨";
    }

    let textoFinal = `👥 *MEMBROS DO GRUPO: ${metadata.subject}*\n\n`;
    
    const lista = participants.map((p, index) => {
      const numero = p.id.split("@")[0];
      const adminTag = (p.admin === "admin" || p.admin === "superadmin") ? " ⭐" : "";
      return `${index + 1}. +${numero}${adminTag}`;
    }).join("\n");

    textoFinal += lista;
    textoFinal += `\n\nTotal: ${participants.length} membros.`;

    await sock.sendMessage(jid, { text: textoFinal });
    
    return { status: "ok", total: participants.length };
  } catch (e) {
    console.error("❌ Erro ao listar membros:", e.message);
    return "Deu erro pra buscar a galera do grupo... 😵";
  }
}
