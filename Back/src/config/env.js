import "dotenv/config";

const required = ["TURSO_DATABASE_URL", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Falta la variable de entorno ${key}. Copia .env.example a .env.`);
  }
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv,
  // Nivel de log de pino. Por defecto: detallado en dev, sobrio en prod.
  logLevel: process.env.LOG_LEVEL ?? (nodeEnv === "production" ? "info" : "debug"),
  // Acepta uno o varios orígenes separados por coma (p. ej. el dominio de Vercel + localhost).
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  turso: {
    url: process.env.TURSO_DATABASE_URL,
    // Opcional para una base local (file:./...); requerido para Turso en la nube.
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
};
