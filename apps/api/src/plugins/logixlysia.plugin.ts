import type { LogixlysiaConfig } from "logixlysia";
import { env } from "@/config/env";

const isDevelopment = env.NODE_ENV === "development";

export const logixlysiaConfig: LogixlysiaConfig = {
  showStartupMessage: true,
  startupMessageFormat: "simple",

  // Every response carries an X-Request-Id (an id sent by nginx is kept), so a log line can
  // be matched to the request a user reports.
  requestId: true,

  // Colours and pretty lines only in a terminal. In containers the output is one plain line
  // per request that a log collector can parse.
  useColors: isDevelopment,
  pino: {
    level: isDevelopment ? "debug" : "info",
    prettyPrint: isDevelopment
      ? { colorize: true, translateTime: "HH:MM:ss Z", ignore: "pid,hostname" }
      : false,
  },
};
