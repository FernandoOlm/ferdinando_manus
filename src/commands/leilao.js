import fs from "fs";
import path from "path";
import { config } from "../config/index.js";

// Caminho absoluto para garantir que funcione na VPS
const DATA_DIR = path.resolve("src/data");
const POLLS_DB_PATH = path.join(DATA_DIR, "active_polls.json");

/**
 * Garante que o arquivo de enquetes exista.
 */
function ensurePollsDB() {
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`📁 [DEBUG] Criando diretório de dados: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(POLLS_DB_PATH)) {
    console.log(`📄 [DEBUG] Criando arquivo de enquetes: ${POLLS_DB_PATH}`);
    fs.writeFileSync(POLLS_DB_PATH, JSON.stringify({ polls: {} }, null, 2));
  }
}

/**
 * Carrega o banco de enquetes.
 */
function loadPolls() {
  ensurePollsDB();
  try {
    const raw = fs.readFileSync(POLLS_DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("❌ [DEBUG] Erro ao carregar banco de enquetes:", e.message);
    return { polls: {} };
  }
}

/**
 * Salva o banco de enquetes.
 */
function savePolls(data) {
  try {
    fs.writeFileSync(POLLS_DB_PATH, JSON.stringify(data, null, 2));
    console.log(`💾 [DEBUG] Banco de enquetes salvo com sucesso em ${POLLS_DB_PATH}`);
  } catch (e) {
    console.error("❌ [DEBUG] Erro ao salvar banco de enquetes:", e.message);
  }
}

/**
 * Registra uma nova enquete para leilão.
 */
export function registerPoll(pollId, jid, name, options) {
  console.log(`📝 [DEBUG] Tentando registrar enquete: ${name} (ID: ${pollId}) no JID: ${jid}`);
  const db = loadPolls();
  
  db.polls[pollId] = {
    jid,
    name,
    options,
    votes: {},
    createdAt: new Date().toISOString()
  };
  
  savePolls(db);
  console.log(`✅ [DEBUG] Enquete ${pollId} registrada com sucesso!`);
}

/**
 * Registra um voto em uma enquete.
 */
export function registerVote(pollId, voterJid, selectedOptions) {
  console.log(`🗳️ [DEBUG] Recebido voto de ${voterJid} para enquete ${pollId}`);
  const db = loadPolls();
  
  if (db.polls[pollId]) {
    if (selectedOptions && selectedOptions.length > 0) {
      db.polls[pollId].votes[voterJid] = selectedOptions[0];
      savePolls(db);
      console.log(`✅ [DEBUG] Voto de ${voterJid} salvo na enquete ${pollId}`);
    } else {
      delete db.polls[pollId].votes[voterJid];
      savePolls(db);
      console.log(`🗑️ [DEBUG] Voto de ${voterJid} removido da enquete ${pollId}`);
    }
  } else {
    console.log(`⚠️ [DEBUG] Voto ignorado: Enquete ${pollId} não encontrada no banco.`);
  }
}

/**
 * Comando !encerrar_votacao - Finaliza o leilão e anuncia o vencedor.
 */
export async function comandoEncerrarVotacao(msg, sock, from, args) {
  const jid = msg.key.remoteJid;
  console.log(`🔨 [DEBUG] Comando !encerrar_votacao recebido no JID: ${jid}`);
  
  const db = loadPolls();
  console.log(`📊 [DEBUG] Total de enquetes no banco: ${Object.keys(db.polls).length}`);

  // Busca a enquete mais recente desse grupo
  const pollEntries = Object.entries(db.polls)
    .filter(([id, data]) => data.jid === jid)
    .sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));

  console.log(`🔍 [DEBUG] Enquetes encontradas para este grupo: ${pollEntries.length}`);

  if (pollEntries.length === 0) {
    return "Não achei nenhuma enquete ativa aqui pra encerrar, mano. 🤨";
  }

  const [pollId, pollData] = pollEntries[0];
  const votes = Object.entries(pollData.votes);
  console.log(`🏆 [DEBUG] Encerramento da enquete ${pollId} (${pollData.name}) com ${votes.length} votos.`);

  if (votes.length === 0) {
    delete db.polls[pollId];
    savePolls(db);
    return `🔨 *LEILÃO ENCERRADO: ${pollData.name}*\n\nNinguém deu lance, pô! Que vacilo. 😅`;
  }

  // Lógica de vencedor (simplificada para o debug)
  const results = votes.map(([voter, optionValue]) => {
    let optionText = pollData.options[optionValue] || "Lance";
    const value = parseFloat(optionText.replace(/[^\d,.-]/g, "").replace(",", "."));
    return { voter, optionText, value: isNaN(value) ? 0 : value };
  });

  results.sort((a, b) => b.value - a.value);
  const winner = results[0];
  const winnerNumber = winner.voter.split("@")[0];

  delete db.polls[pollId];
  savePolls(db);

  const textoFinal = `🔨 *LEILÃO ENCERRADO!* 🔨\n\n` +
    `📦 *Item:* ${pollData.name}\n` +
    `💰 *Lance Vencedor:* ${winner.optionText}\n` +
    `🏆 *Ganhador:* @${winnerNumber}\n\n` +
    `Parabéns, mano! Chama no PV pra acertar os detalhes. 🤙`;

  await sock.sendMessage(jid, { 
    text: textoFinal, 
    mentions: [winner.voter] 
  });

  return null;
}
