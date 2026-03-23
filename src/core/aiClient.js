import { Groq } from "groq-sdk";
import { config } from "../config/index.js";

const groq = new Groq({
  apiKey: config.GROQ_API_KEY,
});

// Memória temporária de conversas (em produção, considere usar um banco de dados ou arquivo)
const conversationHistory = new Map();

/**
 * Gera uma resposta da IA usando o Groq SDK com suporte a histórico.
 * @param {string} prompt - O prompt do usuário.
 * @param {string} jid - O ID do chat para manter o histórico.
 * @param {string} [systemPrompt] - Prompt de sistema opcional.
 * @returns {Promise<string>} - A resposta gerada pela IA.
 */
export async function aiGenerateReply(prompt, jid, systemPrompt = config.AI.SYSTEM_PROMPT) {
  if (!config.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY não configurada.");
    return "Tô meio perdido aqui, sem chave de acesso... 😵‍💫";
  }

  try {
    // Inicializa ou recupera o histórico do JID
    if (!conversationHistory.has(jid)) {
      conversationHistory.set(jid, []);
    }
    
    const history = conversationHistory.get(jid);
    
    // Adiciona a nova mensagem do usuário ao histórico
    history.push({ role: "user", content: prompt });

    // Mantém apenas as últimas 10 mensagens para não estourar o contexto
    if (history.length > 10) {
      history.shift();
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: config.AI.MODEL,
      temperature: config.AI.TEMPERATURE,
      max_completion_tokens: config.AI.MAX_TOKENS,
    });

    const reply = completion.choices[0]?.message?.content || "Fiquei sem palavras agora... 😶";

    // Adiciona a resposta da IA ao histórico
    history.push({ role: "assistant", content: reply });

    return reply;
  } catch (error) {
    console.error("❌ Erro ao gerar resposta da IA:", error.message);
    
    if (error.status === 429) {
      return "Calma aí, muita gente falando ao mesmo tempo! Dá um segundinho... 🧘‍♂️";
    }
    
    return "Deu um nó aqui no meu cérebro... Tenta de novo? 😵";
  }
}

// Alias para compatibilidade legada
export const aiGenerateReply_Unique01 = (prompt, jid) => aiGenerateReply(prompt, jid);
