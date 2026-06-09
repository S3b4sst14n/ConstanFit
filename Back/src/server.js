import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`API escuchando en http://localhost:${env.port}`);
});

const shutdown = async (signal) => {
  logger.info({ signal }, "Cerrando servidor...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
