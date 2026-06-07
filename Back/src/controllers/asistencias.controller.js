import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { crudController } from "../lib/crud.js";

const asistenciaSchema = z.object({
  clientId: z.number().int().positive(),
  fecha: z.coerce.date(),
  notas: z.string().optional(),
});

const include = { cliente: true };

const base = crudController("asistencia", {
  schema: asistenciaSchema,
  label: "Asistencia",
  orderBy: { fecha: "desc" },
  include,
});

// list/get/update/remove se reutilizan; create es propio porque la tabla real
// exige `check_in` (NOT NULL). Usamos la misma fecha de la asistencia como hora
// de check-in (el panel registra la asistencia de un día, sin hora explícita).
export const { list, get, update, remove } = base;

export async function create(req, res) {
  const data = asistenciaSchema.parse(req.body);
  const item = await prisma.asistencia.create({
    data: { ...data, checkIn: data.fecha },
    include,
  });
  res.status(201).json({ item });
}
