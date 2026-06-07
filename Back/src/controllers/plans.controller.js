import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";

const planSchema = z.object({
  nombre: z.string().min(1),
  precio: z.number().nonnegative(),
  duracionDias: z.number().int().positive(),
  descripcion: z.string().optional(),
  activo: z.boolean().optional(),
});

// GET /api/plans  — público. ?all=1 incluye también los inactivos.
export async function list(req, res) {
  const plans = await prisma.plan.findMany({
    where: {
      deletedAt: null,
      ...(req.query.all ? {} : { activo: true }),
    },
    orderBy: { duracionDias: "asc" },
  });
  res.json({ plans });
}

export async function get(req, res) {
  const plan = await prisma.plan.findFirst({
    where: { id: Number(req.params.id), deletedAt: null },
  });
  if (!plan) throw new HttpError(404, "Plan no encontrado");
  res.json({ plan });
}

export async function create(req, res) {
  const data = planSchema.parse(req.body);
  const plan = await prisma.plan.create({ data });
  res.status(201).json({ plan });
}

export async function update(req, res) {
  const id = Number(req.params.id);
  await ensureExists(id);
  const data = planSchema.partial().parse(req.body);
  const plan = await prisma.plan.update({ where: { id }, data });
  res.json({ plan });
}

export async function remove(req, res) {
  const id = Number(req.params.id);
  await ensureExists(id);
  await prisma.plan.update({ where: { id }, data: { deletedAt: new Date() } });
  res.status(204).end();
}

async function ensureExists(id) {
  const plan = await prisma.plan.findFirst({ where: { id, deletedAt: null } });
  if (!plan) throw new HttpError(404, "Plan no encontrado");
}
