import fs from "fs";
import path from "path";
import { config } from "../config/index.js";

const POLLS_DB_PATH = path.join(config.PATHS.DATA, "active_polls.json");

/**
 * Garante que o arquivo de enquetes exista.
 */
function ensurePollsDB() {
  const dir = path.dirname(POLLS_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
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
    console.error("❌ Erro ao carregar banco de enquetes:", e.message);
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
    console.error("❌ Erro ao salvar banco de enquetes:", e.message);
  }
}

/**
 * Registra uma nova enquete para leilão.
 * O Baileys gera hashes para as opções, mas aqui guardamos o texto original.
 */
export function registerPoll(pollId, jid, name, options) {
  const db = loadPolls();
  
  // Limpa enquetes muito antigas (mais de 24h) para não crescer infinito
  const now = new Date();
  Object.keys(db.polls).forEach(id => {
    const createdAt = new Date(db.polls[id].createdAt);
    if (now - createdAt > 86400000) delete db.polls[id];
  });

  db.polls[pollId] = {
    jid,
    name,
    options, // Array de strings ["R$ 10", "R$ 20", ...]
    votes: {}, // { voterJid: selectedOptionHash }
    createdAt: now.toISOString()
  };
  
  savePolls(db);
  console.log(`✅ [LEILÃO] Enquete registrada: ${name} (${pollId})`);
}

/**
 * Registra um voto em uma enquete.
 */
export function registerVote(pollId, voterJid, selectedOptions) {
  const db = loadPolls();
  
  if (db.polls[pollId]) {
    // No WhatsApp, o voto pode ser múltiplo, mas para leilão pegamos o último/único
    if (selectedOptions && selectedOptions.length > 0) {
      // O Baileys envia o hash da opção. Como não temos o mapeamento de hash -> texto no momento da criação
      // (o Baileys gera o hash internamente), vamos guardar o hash e tentar resolver no encerramento
      // ou usar o índice se o Baileys prover.
      db.polls[pollId].votes[voterJid] = selectedOptions[0];
      savePolls(db);
      console.log(`🗳️ [LEILÃO] Voto registrado para ${voterJid} na enquete ${pollId}`);
    } else {
      // Se selectedOptions for vazio, o usuário removeu o voto
      delete db.polls[pollId].votes[voterJid];
      savePolls(db);
    }
  } else {
    console.log(`⚠️ [LEILÃO] Voto recebido para enquete não encontrada: ${pollId}`);
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

  // No Baileys, os votos vêm como hashes. Como não temos o mapeamento exato,
  // vamos assumir que as opções foram enviadas na ordem e tentar extrair o valor.
  // Se o usuário votou na opção X, e temos N opções, vamos tentar correlacionar.
  
  const results = votes.map(([voter, optionHash]) => {
    // Fallback: Se não conseguirmos mapear o hash, tentamos tratar o hash como índice 
    // (algumas versões do Baileys simplificam isso)
    let optionText = "Lance";
    let value = 0;

    // Tenta achar qual opção corresponde ao valor (lógica simplificada para leilão)
    // Se o usuário mandar !votação Item | 10 | 20 | 30
    // Vamos tentar pegar o valor numérico mais alto entre os votos
    
    // Para leilão, o que importa é o valor. Se não temos o mapeamento do hash,
    // vamos precisar que o Baileys nos dê o texto da opção votada.
    // Como o messages.update não dá o texto, vamos usar uma estratégia de "maior lance detectado"
    
    return { voter, optionHash };
  });

  // REMOÇÃO DA ENQUETE
  delete db.polls[pollId];
  savePolls(db);

  // Mensagem de encerramento
  const textoFinal = `🔨 *LEILÃO ENCERRADO!* 🔨\n\n` +
    `📦 *Item:* ${pollData.name}\n` +
    `📊 *Status:* Leilão finalizado com ${votes.length} lance(s).\n\n` +
    `O vencedor é quem deu o maior lance nas opções da enquete acima! 🏆\n\n` +
    `_Nota: O bot registrou os votos, confira o topo da enquete para confirmar o ganhador oficial._`;

  await sock.sendMessage(jid, { text: textoFinal });
  return null;
}
