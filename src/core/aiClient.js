import { Groq } from "groq-sdk";
import { config } from "../config/index.js";

const groq = new Groq({
  apiKey: config.GROQ_API_KEY,
});

/**
 * Gera uma resposta da IA usando o Groq SDK.
 * @param {string} prompt - O prompt do usuário.
 * @param {string} [systemPrompt] - Prompt de sistema opcional para sobrescrever o padrão.
 * @returns {Promise<string>} - A resposta gerada pela IA.
 */
export async function aiGenerateReply(prompt, systemPrompt = config.AI.SYSTEM_PROMPT) {
  if (!config.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY não configurada.");
    return "Tô meio perdido aqui, sem chave de acesso... 😵‍💫";
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      model: config.AI.MODEL,
      temperature: config.AI.TEMPERATURE,
      max_completion_tokens: config.AI.MAX_TOKENS,
    });

    return completion.choices[0]?.message?.content || "Fiquei sem palavras agora... 😶";
  } catch (error) {
    console.error("❌ Erro ao gerar resposta da IA:", error.message);
    
    if (error.status === 429) {
      return "Calma aí, muita gente falando ao mesmo tempo! Dá um segundinho... 🧘‍♂️";
    }
    
    return "Deu um nó aqui no meu cérebro... Tenta de novo? 😵";
  }
}

// Alias para compatibilidade legada
export const aiGenerateReply_Unique01 = aiGenerateReply;
