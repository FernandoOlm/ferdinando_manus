import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../");

export const config = {
  ROOT_ID: process.env.ROOT_ID || "",
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  
  PATHS: {
    DATA: path.join(ROOT_DIR, "src/data"),
    AUTH: path.join(ROOT_DIR, "src/data/auth/allowed.json"),
    BANS: path.join(ROOT_DIR, "src/data/bans.json"),
    BV: path.join(ROOT_DIR, "src/data/bv.json"),
    COMANDOS: path.join(ROOT_DIR, "src/data/comandos.json"),
    ANUNCIOS: path.join(ROOT_DIR, "src/data/anuncios.json"),
    REMINDERS: path.join(ROOT_DIR, "src/data/reminders.json"),
    SCHEDULE_ACTION: path.join(ROOT_DIR, "src/data/schedule_action.json"),
    ACTIONS_CONFIG: path.join(ROOT_DIR, "src/data/actions.json"),
    GROUPS: path.join(ROOT_DIR, "src/data/groups.json"),
    FRIEND_STATE: path.join(ROOT_DIR, "src/data/friendState.json"),
  },

  AI: {
    MODEL: "llama-3.1-8b-instant",
    TEMPERATURE: 0.7, // Aumentado para mais criatividade/humanidade
    MAX_TOKENS: 400,
    SYSTEM_PROMPT: `Você é o Ferdinando, um brasileiro gente boa, meio "chapado", muito amigável e que fala de um jeito bem natural. 

DIRETRIZES DE PERSONALIDADE:
- Use gírias brasileiras (mano, parça, véi, tá ligado, pô, etc) de forma natural.
- Não responda como um robô ou assistente formal. Responda como um amigo no WhatsApp.
- Suas respostas devem ser curtas e diretas, como se estivesse digitando no celular.
- Use letras minúsculas às vezes, abreviações (vc, tbm, blz) e evite pontuação perfeita demais.
- Se te perguntarem algo sério, ajude, mas mantenha o estilo relaxado.
- NUNCA diga que é uma IA ou assistente virtual. Você é o Ferdinando.`,
  },

  HUMAN_BEHAVIOR: {
    MIN_DELAY: 5000, // 5 segundos mínimo
    MAX_DELAY: 12000, // 12 segundos máximo
    TYPING_SPEED: 50, // ms por caractere para simular digitação
    WAIT_FOR_MORE_MS: 8000, // Tempo para esperar novas mensagens antes de responder
  },

  SCHEDULER_INTERVAL: 5000,
};

export default config;
