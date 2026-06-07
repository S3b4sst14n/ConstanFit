import { z } from "zod";
import { crudController } from "../lib/crud.js";

// Categorías fijas de la tienda. Se guarda el "slug"; el frontend lo muestra
// con su etiqueta bonita (Ropa deportiva, Snacks/Bocadillos, etc.).
export const CATEGORIAS = ["ropa", "snacks", "preentreno", "agua", "otro"];

const productoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  categoria: z.enum(CATEGORIAS).default("otro"),
  precio: z.number().nonnegative(),
  stock: z.number().int().nonnegative().optional(),
  descripcion: z.string().optional(),
  activo: z.boolean().optional(),
});

export const { list, get, create, update, remove } = crudController("producto", {
  schema: productoSchema,
  label: "Producto",
  orderBy: { nombre: "asc" },
});
