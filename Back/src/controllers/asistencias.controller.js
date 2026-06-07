import { z } from "zod";
import { crudController } from "../lib/crud.js";

const asistenciaSchema = z.object({
  clientId: z.number().int().positive(),
  fecha: z.coerce.date(),
  notas: z.string().optional(),
});

export const { list, get, create, update, remove } = crudController("asistencia", {
  schema: asistenciaSchema,
  label: "Asistencia",
  orderBy: { fecha: "desc" },
  include: { cliente: true },
});
