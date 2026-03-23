import { aiGenerateReply } from "../core/aiClient.js";
import fs from "fs";
import path from "path";
import { config } from "../config/index.js";
import { registerPoll } from "./leilao.js";

/**
 * !resumo - Resume as últimas mensagens do grupo.
 */
export async function cmdResumo(msg, sock) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith("@g.us")) return "Isso aqui é só pra grupo, mano! 🏢";

  try {
    // Simula a leitura de logs (em um sistema real, buscaria do banco de logs)
    const logPath = path.join(config.PATHS.DATA, "logs", `${new Date().toISOString().split('T')[0]}.json`);
    let context = "Não achei nada pra resumir agora, parça.";
    
    if (fs.existsSync(logPath)) {
      const logs = JSON.parse(fs.readFileSync(logPath, "utf8"));
      const lastMsgs = logs.filter(l => l.jid === jid).slice(-20).map(l => `${l.pushName}: ${l.text}`).join("\n");
      if (lastMsgs) context = lastMsgs;
    }

    const prompt = `Faça um resumo bem rápido e informal (estilo Ferdinando) do que a galera tá falando aqui:\n\n${context}`;
    return await aiGenerateReply(prompt, jid);
  } catch (e) {
    return "Deu erro pra ler a conversa, maluco. 😵";
  }
}

/**
 * !clima - Mostra o clima de uma cidade.
 */
export async function cmdClima(msg, sock, from, args) {
  const cidade = args.join(" ");
  if (!cidade) return "Diz a cidade aí, pô! Ex: !clima São Paulo";

  const prompt = `Como tá o clima em ${cidade} agora? Responda do seu jeito Ferdinando, mas com a info real se souber, ou brincando se não souber.`;
  return await aiGenerateReply(prompt, msg.key.remoteJid);
}

/**
 * !noticias - Mostra as principais notícias.
 */
export async function cmdNoticias(msg, sock) {
  const prompt = "Quais as 3 notícias mais quentes do Brasil hoje? Resume pra mim no seu estilo Ferdinando.";
  return await aiGenerateReply(prompt, msg.key.remoteJid);
}

/**
 * !traduzir - Traduz um texto.
 */
export async function cmdTraduzir(msg, sock, from, args) {
  if (args.length < 2) return "Uso: !traduzir [idioma] [texto]. Ex: !traduzir ingles tudo bem?";
  const idioma = args[0];
  const texto = args.slice(1).join(" ");
  
  const prompt = `Traduza isso aqui para ${idioma}: "${texto}". Responda apenas a tradução, mas pode colocar um emoji no final.`;
  return await aiGenerateReply(prompt, msg.key.remoteJid);
}

/**
 * !estatisticas - Estatísticas do grupo.
 */
export async function cmdEstatisticas(msg, sock) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith("@g.us")) return "Só em grupo, tá ligado? 🏢";
  
  return "Tô analisando quem é o mais falador aqui... Em breve te mando o ranking! 📊";
}

/**
 * !ia-imagem - Sugestão de prompt para imagem.
 */
export async function cmdIAImagem(msg, sock, from, args) {
  const desc = args.join(" ");
  if (!desc) return "Diz o que vc quer ver, mano! Ex: !ia-imagem um macaco surfando";
  
  const prompt = `Crie um prompt detalhado em inglês para uma IA geradora de imagem (como Midjourney) baseado nisso: "${desc}". Responda de forma curta.`;
  const aiPrompt = await aiGenerateReply(prompt, msg.key.remoteJid);
  return `Aqui tá o código pra gerar essa brisa, mano:\n\n\`${aiPrompt}\``;
}

/**
 * !votação - Cria uma enquete rápida e registra no sistema de leilão.
 */
export async function cmdVotacao(msg, sock, from, args) {
  const full = args.join(" ");
  const partes = full.split("|").map(p => p.trim());
  if (partes.length < 3) return "Uso: !votação Pergunta | Opção 1 | Opção 2";

  const pergunta = partes[0];
  const opcoes = partes.slice(1);
  const jid = msg.key.remoteJid;

  // Envia a enquete
  const sent = await sock.sendMessage(jid, {
    poll: {
      name: pergunta,
      values: opcoes,
      selectableCount: 1
    }
  });

  // REGISTRO IMEDIATO NO SISTEMA DE LEILÃO (USANDO O ID DA MENSAGEM ENVIADA)
  if (sent && sent.key && sent.key.id) {
    console.log(`📝 [LEILÃO] Registrando enquete enviada: ${pergunta} (ID: ${sent.key.id})`);
    registerPoll(sent.key.id, jid, pergunta, opcoes);
  }

  return null;
}

/**
 * !perfil - O que o bot sabe sobre você.
 */
export async function cmdPerfil(msg, sock, from) {
  const prompt = `O que você lembra sobre o usuário ${from}? Invente algo engraçado baseado no estilo Ferdinando se não lembrar de nada real.`;
  return await aiGenerateReply(prompt, msg.key.remoteJid);
}

/**
 * !limpar - Apaga mensagens do bot (simulado).
 */
export async function cmdLimpar(msg, sock) {
  return "Vou dar uma geral aqui no chat jajá, blz? 🧹";
}

/**
 * !ajuda - Lista os novos comandos.
 */
export async function cmdNovosComandos(msg) {
  return `🌿 *NOVOS COMANDOS DO FERDINANDO* 🌿

!resumo - O que tá rolando no grupo
!clima [cidade] - Como tá o tempo
!noticias - Giro de notícias
!traduzir [idioma] [texto] - Tradutor parça
!estatisticas - Quem fala mais?
!ia-imagem [desc] - Prompt pra brisa visual
!votação P | O1 | O2 - Enquete rápida
!perfil - O que eu sei de vc
!limpar - Faxina no chat
!novos - Ver essa lista

Curtiu, mano? Só mandar! 🤙`;
}
