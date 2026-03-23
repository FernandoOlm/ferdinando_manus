import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { config } from "../config/index.js";

/**
 * Inicializa a conexão com o WhatsApp.
 * @returns {Promise<Object>} - A instância do socket do Baileys.
 */
export async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      trace: () => {},
      fatal: () => {},
      child: function() { return this; },
    },
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("\x1b[32m🔥 Ferdinando conectado!\x1b[0m");
    }

    if (connection === "close") {
      console.log("\x1b[31m❌ Conexão fechada! Reconectando...\x1b[0m");
      setTimeout(() => connectToWhatsApp(), 5000);
    }
  });

  return sock;
}
