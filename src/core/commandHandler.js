import fs from "fs";
import path from "path";
import { config } from "../config/index.js";

/**
 * Carrega o arquivo de comandos JSON.
 */
function loadCommandsJSON() {
  try {
    const raw = fs.readFileSync(config.PATHS.COMANDOS, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("❌ Erro ao carregar comandos.json:", e.message);
    return {};
  }
}

/**
 * Verifica se o usuário tem permissão para executar o comando.
 */
async function hasPermission(sock, jid, senderNumber, cmdConfig) {
  if (!cmdConfig.admin) return true;

  // Verifica se é o ROOT
  if (senderNumber === config.ROOT_ID.replace(/@.*/, "")) return true;

  // Verifica se é admin do grupo
  if (jid.endsWith("@g.us")) {
    const metadata = await sock.groupMetadata(jid);
    const isAdmin = metadata.participants.some(
      p => p.id.replace(/@.*/, "") === senderNumber && (p.admin === "admin" || p.admin === "superadmin")
    );
    if (isAdmin) return true;
  }

  // Verifica no arquivo de autorizados
  try {
    const authDB = JSON.parse(fs.readFileSync(config.PATHS.AUTH, "utf8"));
    const groupAuth = authDB.grupos[jid];
    if (groupAuth?.autorizados?.includes(senderNumber)) return true;
  } catch (e) {}

  return false;
}

/**
 * Processa e executa um comando técnico.
 */
export async function handleCommand(sock, msg, text) {
  const commandsJSON = loadCommandsJSON();
  const args = text.split(" ");
  const cmdName = args[0].toLowerCase();
  const cmdConfig = commandsJSON[cmdName];

  if (!cmdConfig) return null;

  const jid = msg.key.remoteJid;
  const senderNumber = (msg.key.participant || msg.key.remoteJid).replace(/@.*/, "");

  // Validar permissão
  const allowed = await hasPermission(sock, jid, senderNumber, cmdConfig);
  if (!allowed) {
    return "Sem permissão, mano. 🚫";
  }

  try {
    // Import dinâmico do módulo do comando
    const modulePath = path.resolve("src", cmdConfig.file.replace("../", ""));
    const module = await import(`file://${modulePath}?v=${Date.now()}`);
    const fn = module[cmdConfig.function];

    if (typeof fn !== "function") {
      throw new Error(`Função ${cmdConfig.function} não encontrada no módulo ${cmdConfig.file}`);
    }

    // Executa o comando
    const result = await fn(msg, sock, senderNumber, args.slice(1));

    // Formata o retorno
    if (typeof result === "string") return result;
    if (result?.mensagem) return result.mensagem;
    if (result?.texto) return result.texto;
    
    return "Comando executado, blz? ✅";
  } catch (e) {
    console.error(`❌ Erro ao executar comando ${cmdName}:`, e.message);
    return "Deu erro aqui pra rodar esse comando... 😵";
  }
}
