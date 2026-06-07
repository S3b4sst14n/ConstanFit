import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

// Al existir este archivo, Prisma deja de cargar `.env` automáticamente y de leer
// la clave `prisma` de package.json: por eso importamos dotenv arriba y movemos
// aquí la config de `seed`.
//
// `studio.adapter` hace que Prisma Studio (y el CLI) se conecten a Turso por el
// mismo driver adapter de libSQL que usa el runtime, en vez de abrir el archivo
// SQLite local de DATABASE_URL (que no existe). Así Studio ve los datos reales.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),

  // El adapter en Studio es experimental en Prisma 6.x.
  experimental: {
    studio: true,
  },

  migrations: {
    seed: "node prisma/seed.js",
  },

  studio: {
    adapter: async () => {
      const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
      return new PrismaLibSQL({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    },
  },
});
