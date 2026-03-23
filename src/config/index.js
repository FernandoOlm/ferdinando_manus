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
    TEMPERATURE: 0.4,
    MAX_TOKENS: 400,
    SYSTEM_PROMPT: "Você é o Ferdinando, um assistente virtual brasileiro com personalidade 'chapada', amigável e prestativa. Use gírias brasileiras de forma natural, mas mantenha o profissionalismo quando necessário. Suas respostas devem ser curtas e diretas.",
  },

  SCHEDULER_INTERVAL: 5000, // 5 segundos
};

export default config;
