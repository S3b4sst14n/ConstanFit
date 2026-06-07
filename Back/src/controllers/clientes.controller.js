import { z } from "zod";
import { crudController } from "../lib/crud.js";

const clienteSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  email: z.string().email().optional(),
  identificationNumber: z.string().min(1, "El documento es obligatorio"),
  fechaNacimiento: z.coerce.date(),
  celular: z.string().optional(),
  estado: z.enum(["activo", "inactivo", "suspendido"]).optional(),
  notas: z.string().optional(),
});

export const { list, get, create, update, remove } = crudController("cliente", {
  schema: clienteSchema,
  label: "Cliente",
  orderBy: { nombre: "asc" },
});
