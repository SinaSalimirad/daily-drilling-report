import type { LogixlysiaConfig } from "logixlysia";

export const logixlysiaConfig: LogixlysiaConfig = {
  showStartupMessage: true,
  startupMessageFormat: "simple",

  // Pretty printing for development
  pino: {
    level: "debug",
    prettyPrint: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    },
  },
};
