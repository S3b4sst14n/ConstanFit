import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { crudController } from "../lib/crud.js";

// endDate es opcional: si no se envía, se calcula desde la duración del plan
// (el frontend solo registra cuándo arranca la suscripción).
const suscripcionSchema = z.object({
  clientId: z.number().int().positive(),
  planId: z.number().int().positive(),
  estado: z.enum(["activa", "vencida", "cancelada", "pausada"]).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

const include = { cliente: true, plan: true };

const base = crudController("suscripcion", {
  schema: suscripcionSchema,
  label: "Suscripción",
  orderBy: { startDate: "desc" },
  include,
});

// list/get/update/remove se reutilizan del CRUD genérico; create es propio
// para poder calcular la fecha de vencimiento a partir del plan.
export const { list, get, update, remove } = base;

export async function create(req, res) {
  const data = suscripcionSchema.parse(req.body);

  if (!data.endDate) {
    const plan = await prisma.plan.findFirst({
      where: { id: data.planId, deletedAt: null },
    });
    if (!plan) throw new HttpError(404, "Plan no encontrado");
    const end = new Date(data.startDate);
    end.setDate(end.getDate() + plan.duracionDias);
    data.endDate = end;
  }

  const item = await prisma.suscripcion.create({ data, include });
  res.status(201).json({ item });
}
