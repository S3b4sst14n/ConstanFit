// Crea las tablas de la tienda (productos, ventas) en la base Turso/libSQL.
// Idempotente: usa CREATE TABLE IF NOT EXISTS, así que puede correrse varias
// veces sin romper nada. Necesario porque el proyecto no usa prisma migrate;
// el esquema se aplica con SQL (ver init-turso.sql) y aquí solo añadimos lo nuevo.
//
// Uso:  npm run db:tienda   (desde la carpeta Back/)
import { createClient } from "@libsql/client";
import { env } from "../src/config/env.js";

const client = createClient({
  url: env.turso.url,
  authToken: env.turso.authToken,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "productos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'otro',
    "precio" REAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS "ventas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "product_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precio_unitario" REAL NOT NULL,
    "total" REAL NOT NULL,
    "metodo_pago" TEXT NOT NULL,
    "notas" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME,
    CONSTRAINT "ventas_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "productos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
];

try {
  for (const sql of statements) {
    await client.execute(sql);
  }
  console.log("Tablas de la tienda listas: productos, ventas.");
} catch (err) {
  console.error("No se pudieron crear las tablas de la tienda:", err);
  process.exitCode = 1;
} finally {
  client.close();
}
