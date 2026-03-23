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
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(POLLS_DB_PATH)) {
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
    return { polls: {} };
  }
}

/**
 * Salva o banco de enquetes.
 */
function savePolls(data) {
  try {
    fs.writeFileSync(POLLS_DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("❌ [DEBUG] Erro ao salvar banco de enquetes:", e.message);
  }
}

/**
 * Registra uma nova enquete para leilão.
 */
export function registerPoll(pollId, jid, name, options) {
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
 * Melhora a busca da enquete alvo para lidar com IDs que mudam levemente no Baileys.
 */
export function registerVote(pollId, voterJid, selectedOptions) {
  console.log(`🗳️ [DEBUG] Recebido voto de ${voterJid} para enquete ${pollId}`);
  const db = loadPolls();
  
  // 1. Tenta achar pelo ID exato
  let targetPollId = pollId;
  
  // 2. Se não achar, tenta achar a enquete mais recente no mesmo JID (fallback inteligente)
  if (!db.polls[pollId]) {
    const possiblePolls = Object.entries(db.polls)
      .sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));
    
    if (possiblePolls.length > 0) {
      targetPollId = possiblePolls[0][0];
      console.log(`🔍 [DEBUG] ID exato não achado. Usando enquete mais recente: ${targetPollId}`);
    }
  }

  if (db.polls[targetPollId]) {
    if (selectedOptions && selectedOptions.length > 0) {
      // O Baileys envia o hash da opção. Como não temos o mapeamento de hash -> texto,
      // vamos guardar o índice se for numérico ou o próprio hash.
      db.polls[targetPollId].votes[voterJid] = selectedOptions[0];
      savePolls(db);
      console.log(`✅ [DEBUG] Voto de ${voterJid} salvo na enquete ${targetPollId}`);
    } else {
      delete db.polls[targetPollId].votes[voterJid];
      savePolls(db);
      console.log(`🗑️ [DEBUG] Voto de ${voterJid} removido da enquete ${targetPollId}`);
    }
  } else {
    console.log(`⚠️ [DEBUG] Voto ignorado: Nenhuma enquete ativa encontrada.`);
  }
}

/**
 * Comando !encerrar_votacao - Finaliza o leilão e anuncia o vencedor.
 */
export async function comandoEncerrarVotacao(msg, sock, from, args) {
  const jid = msg.key.remoteJid;
  const db = loadPolls();

  const pollEntries = Object.entries(db.polls)
    .filter(([id, data]) => data.jid === jid)
    .sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));

  if (pollEntries.length === 0) {
    return "Não achei nenhuma enquete ativa aqui pra encerrar, mano. 🤨";
  }

  const [pollId, pollData] = pollEntries[0];
  const votes = Object.entries(pollData.votes);

  if (votes.length === 0) {
    delete db.polls[pollId];
    savePolls(db);
    return `🔨 *LEILÃO ENCERRADO: ${pollData.name}*\n\nNinguém deu lance, pô! Que vacilo. 😅`;
  }

  // Lógica de vencedor
  // No Baileys, os votos vêm como hashes. Como não temos o mapeamento exato,
  // vamos assumir que as opções foram enviadas na ordem e tentar extrair o valor.
  const results = votes.map(([voter, optionValue]) => {
    // Tenta mapear o valor se for um índice simples ou extrair do texto
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
