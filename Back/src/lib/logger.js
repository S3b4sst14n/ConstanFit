import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "../config/env.js";

// pino-pretty solo en desarrollo: salida coloreada y legible. En producción
// (Railway) y en tests se emite JSON crudo por stdout, sin worker de transport.
const usePretty = env.nodeEnv === "development";

export const logger = pino({
  level: env.logLevel,
  transport: usePretty
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
      }
    : undefined,
  // Nunca escribir secretos en los logs (token JWT del header, cookies).
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    censor: "[oculto]",
  },
});

// Middleware de log por petición: añade req.log (con id de petición) y registra
// cada respuesta con su severidad: 5xx -> error, 4xx -> warn, resto -> info.
export const httpLogger = pinoHttp({
  logger,
  // Por defecto pino-http vuelca TODAS las cabeceras de respuesta (las de
  // helmet) en cada línea: puro ruido. Nos quedamos solo con el status.
  serializers: {
    res: (res) => ({ statusCode: res.statusCode }),
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} -> ${res.statusCode}`;
  },
  customErrorMessage(req, res, err) {
    return `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`;
  },
});
