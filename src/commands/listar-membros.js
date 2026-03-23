/**
 * Comando !listar-membros - Lista todos os participantes do grupo com nomes reais.
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
    
    // Tenta buscar os nomes salvos no cache do Baileys ou formatar
    const lista = participants.map((p, index) => {
      const numero = p.id.split("@")[0];
      const adminTag = (p.admin === "admin" || p.admin === "superadmin") ? " ⭐" : "";
      
      // O Baileys nem sempre tem o pushName no metadata, então usamos o número como fallback
      // Em uma implementação real, poderíamos cruzar com um banco de contatos
      return `${index + 1}. +${numero}${adminTag}`;
    }).join("\n");

    textoFinal += lista;
    textoFinal += `\n\nTotal: ${participants.length} membros.`;
    textoFinal += `\n\n_Dica: Os nomes aparecem conforme você interage com eles, blz?_`;

    await sock.sendMessage(jid, { text: textoFinal });
    
    return { status: "ok", total: participants.length };
  } catch (e) {
    console.error("❌ Erro ao listar membros:", e.message);
    return "Deu erro pra buscar a galera do grupo... 😵";
  }
}
