import { z } from "zod";
import { crudController } from "../lib/crud.js";

const pagoSchema = z.object({
  clientId: z.number().int().positive(),
  suscripcionId: z.number().int().positive(),
  monto: z.number().nonnegative(),
  metodoPago: z.enum(["efectivo", "tarjeta", "transferencia", "nequi"]),
  estado: z.enum(["completado", "pendiente", "fallido", "reembolsado"]).optional(),
  notas: z.string().optional(),
  fechaPago: z.coerce.date().optional(),
});

export const { list, get, create, update, remove } = crudController("pago", {
  schema: pagoSchema,
  label: "Pago",
  orderBy: { fechaPago: "desc" },
  include: { cliente: true, suscripcion: true },
});
