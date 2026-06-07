import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { env } from "../config/env.js";

const globalForPrisma = globalThis;

function createPrisma() {
  // Driver adapter de libSQL: conecta a Turso (o a un archivo local file:./...).
  const adapter = new PrismaLibSQL({
    url: env.turso.url,
    authToken: env.turso.authToken,
  });

  return new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });
}

export const prisma = globalForPrisma.__prisma ?? createPrisma();

if (env.nodeEnv !== "production") {
  globalForPrisma.__prisma = prisma;
}
