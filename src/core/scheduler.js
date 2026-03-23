import fs from "fs";
import { config } from "../config/index.js";
import { enviar_lembrete } from "../commands/enviar-lembrete.js";

/**
 * Inicia o loop do agendador de tarefas.
 * @param {Object} sock - A instância do socket do Baileys.
 */
export function startScheduler(sock) {
  setInterval(async () => {
    try {
      const agora = new Date();

      // 1) Lembretes
      if (fs.existsSync(config.PATHS.REMINDERS)) {
        const dbRem = JSON.parse(fs.readFileSync(config.PATHS.REMINDERS, "utf8"));
        const lembretesAGATILHAR = dbRem.lembretes.filter(
          l => new Date(l.quando) <= agora
        );

        for (const lembrete of lembretesAGATILHAR) {
          await enviar_lembrete(lembrete, sock);
        }
      }

      // 2) Ações Agendadas (Abrir/Fechar Grupo)
      if (fs.existsSync(config.PATHS.SCHEDULE_ACTION)) {
        const actionDB = JSON.parse(fs.readFileSync(config.PATHS.SCHEDULE_ACTION, "utf8"));
        const acao = actionDB.acao;

        if (acao && !acao.aconteceu && acao.data && acao.hora) {
          const horarioAcao = new Date(`${acao.data}T${acao.hora}:00`);
          if (agora >= horarioAcao) {
            const configActions = fs.existsSync(config.PATHS.ACTIONS_CONFIG)
              ? JSON.parse(fs.readFileSync(config.PATHS.ACTIONS_CONFIG, "utf8"))
              : {};

            const comandoConfig = configActions[acao.comando] || null;
            const relativeFile = comandoConfig?.file || acao.file;
            const fnName = comandoConfig?.function || acao.function;

            const fileAbsPath = new URL(relativeFile, import.meta.url).pathname;
            const modulo = await import(fileAbsPath + `?v=${Date.now()}`);
            const fn = modulo[fnName];

            if (typeof fn === "function") {
              await fn({ key: { remoteJid: acao.grupo }, message: {} }, sock);
              acao.aconteceu = true;
              fs.writeFileSync(config.PATHS.SCHEDULE_ACTION, JSON.stringify(actionDB, null, 2));
            }
          }
        }
      }
    } catch (e) {
      console.error("❌ Erro no loop do agendador:", e.message);
    }
  }, config.SCHEDULER_INTERVAL);
}
