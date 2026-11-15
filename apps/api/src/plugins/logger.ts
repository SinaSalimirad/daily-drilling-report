import logixlysia, { type LogLevel, type Transport } from 'logixlysia';
import { requestIdOf } from './request-id';

// docs/06-logging.md: one line per request; readable in development, one JSON
// object per line in production; threshold from LOG_LEVEL.
// Logged: time, level, requestId, method, path, status, durationMs, errorCode.
// Never logged: headers, cookies, query strings, bodies.

export type LoggerOptions = {
  production: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Receives each JSON line. Default: stdout. Setting it forces JSON output (tests). */
  write?: (line: string) => void;
};

const LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];
const THRESHOLD = { debug: 0, info: 1, warn: 2, error: 3 } as const;
const LEVEL_NAME: Record<LogLevel, string> = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warn',
  ERROR: 'error',
};

type Meta = {
  request?: { method?: string; url?: string };
  status?: number;
  durationMs?: number;
  context?: Record<string, unknown>;
  error?: { code?: unknown; message?: string; stack?: string };
};

/** logixlysia 6 has no JSON console format, so production lines go through this transport. */
export function jsonLines(write: (line: string) => void): Transport {
  return {
    log(level, message, meta) {
      const m = (meta ?? {}) as Meta;
      const { requestId, ...context } = m.context ?? {};
      write(
        JSON.stringify({
          time: new Date().toISOString(),
          level: LEVEL_NAME[level],
          requestId,
          method: m.request?.method,
          path: m.request?.url ? new URL(m.request.url).pathname : undefined,
          status: m.status,
          durationMs: m.durationMs === undefined ? undefined : Math.round(m.durationMs * 100) / 100,
          ...context,
          ...(m.status !== undefined && m.status < 400 ? {} : { message }),
        }),
      );
    },
  };
}

export const logger = ({ production, level, write }: LoggerOptions) => {
  const json = production || write !== undefined;
  return logixlysia({
    preset: json ? 'json' : 'dev',
    config: {
      service: 'api',
      requestId: false, // owned by plugins/request-id.ts
      enrichers: [(request) => ({ requestId: requestIdOf(request) })],
      logFilter: { level: LEVELS.slice(THRESHOLD[level]) },
      logQueryParams: false,
      logErrorPayload: false,
      ip: false,
      disableFileLogging: true,
      showStartupMessage: false,
      ...(json
        ? {
            transports: [jsonLines(write ?? ((line) => process.stdout.write(`${line}\n`)))],
            useTransportsOnly: true,
          }
        : {}),
    },
  });
};
