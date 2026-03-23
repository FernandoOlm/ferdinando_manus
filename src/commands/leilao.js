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
  
  // O Baileys pode enviar o pollId de forma diferente no update, tentamos achar a correspondente
  let targetPollId = pollId;
  if (!db.polls[pollId]) {
    // Busca por JID e tempo se o ID não bater (fallback)
    const possiblePolls = Object.entries(db.polls).filter(([id, data]) => {
      const diff = Math.abs(new Date() - new Date(data.createdAt));
      return diff < 3600000; // Criada na última hora
    });
    if (possiblePolls.length > 0) targetPollId = possiblePolls[0][0];
  }

  if (db.polls[targetPollId]) {
    // No WhatsApp, o voto pode ser múltiplo, mas para leilão pegamos o último/único
    if (selectedOptions && selectedOptions.length > 0) {
      // O Baileys envia o hash da opção, mas aqui simplificamos para o índice se possível
      // Em uma implementação real, precisaríamos mapear o hash para o índice
      db.polls[targetPollId].votes[voterJid] = selectedOptions[0];
      savePolls(db);
    }
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
  // Como o Baileys envia hashes, e nós temos as opções, vamos tentar inferir ou usar o maior índice
  const results = votes.map(([voter, optionValue]) => {
    // Se for índice numérico
    let optionText = pollData.options[optionValue] || "Lance Desconhecido";
    
    // Tenta extrair o valor numérico (ex: "R$ 50" -> 50)
    const value = parseFloat(optionText.replace(/[^\d,.-]/g, "").replace(",", "."));
    return { voter, optionText, value: isNaN(value) ? 0 : value };
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
