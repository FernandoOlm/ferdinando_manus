import fs from "fs";
import path from "path";
import { config } from "../config/index.js";

const POLLS_DB_PATH = path.join(config.PATHS.DATA, "active_polls.json");

/**
 * Garante que o arquivo de enquetes exista.
 */
function ensurePollsDB() {
  if (!fs.existsSync(path.dirname(POLLS_DB_PATH))) {
    fs.mkdirSync(path.dirname(POLLS_DB_PATH), { recursive: true });
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
  return JSON.parse(fs.readFileSync(POLLS_DB_PATH, "utf8"));
}

/**
 * Salva o banco de enquetes.
 */
function savePolls(data) {
  fs.writeFileSync(POLLS_DB_PATH, JSON.stringify(data, null, 2));
}

/**
 * Registra uma nova enquete para leilão.
 */
export function registerPoll(pollId, jid, name, options) {
  const db = loadPolls();
  db.polls[pollId] = {
    jid,
    name,
    options, // Array de strings ["R$ 10", "R$ 20", ...]
    votes: {}, // { voterJid: optionIndex }
    createdAt: new Date().toISOString()
  };
  savePolls(db);
}

/**
 * Registra um voto em uma enquete.
 */
export function registerVote(pollId, voterJid, selectedOptions) {
  const db = loadPolls();
  if (!db.polls[pollId]) return;

  // No WhatsApp, o voto pode ser múltiplo, mas para leilão pegamos o último/único
  if (selectedOptions && selectedOptions.length > 0) {
    db.polls[pollId].votes[voterJid] = selectedOptions[0];
    savePolls(db);
  }
}

/**
 * Comando !encerrar_votacao - Finaliza o leilão e anuncia o vencedor.
 */
export async function comandoEncerrarVotacao(msg, sock, from, args) {
  const jid = msg.key.remoteJid;
  const db = loadPolls();

  // Busca a enquete mais recente desse grupo
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

  // Mapeia os votos para os valores reais
  const results = votes.map(([voter, optionIndex]) => {
    const optionText = pollData.options[optionIndex];
    // Tenta extrair o valor numérico (ex: "R$ 50" -> 50)
    const value = parseFloat(optionText.replace(/[^\d,.-]/g, "").replace(",", "."));
    return { voter, optionText, value };
  });

  // Ordena pelo maior valor
  results.sort((a, b) => b.value - a.value);
  const winner = results[0];
  const winnerNumber = winner.voter.split("@")[0];

  // Remove a enquete do banco
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
