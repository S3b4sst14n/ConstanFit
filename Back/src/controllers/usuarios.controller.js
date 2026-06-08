import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";

// Nunca exponer el passwordHash al cliente.
const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  rolId: u.rolId,
  rol: u.rol?.nombre ?? null,
  activo: u.activo,
  createdAt: u.createdAt,
});

const createSchema = z.object({
  username: z.string().min(3).max(40),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  rolId: z.number().int().positive(),
});

const updateSchema = z.object({
  username: z.string().min(3).max(40).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(100).optional(),
  rolId: z.number().int().positive().optional(),
  activo: z.boolean().optional(),
});

export async function list(_req, res) {
  const items = await prisma.usuario.findMany({
    where: { deletedAt: null },
    include: { rol: true },
    orderBy: { username: "asc" },
  });
  res.json({ items: items.map(publicUser) });
}

// Catálogo de roles para poblar el selector del formulario.
export async function roles(_req, res) {
  const items = await prisma.role.findMany({
    where: { deletedAt: null },
    orderBy: { id: "asc" },
    select: { id: true, nombre: true, descripcion: true },
  });
  res.json({ items });
}

export async function create(req, res) {
  const data = createSchema.parse(req.body);

  const role = await prisma.role.findFirst({ where: { id: data.rolId, deletedAt: null } });
  if (!role) throw new HttpError(400, "Rol no válido");

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.usuario.create({
    data: { username: data.username, email: data.email, passwordHash, rolId: data.rolId },
    include: { rol: true },
  });
  res.status(201).json({ item: publicUser(user) });
}

export async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, "ID inválido");

  const existing = await prisma.usuario.findFirst({
    where: { id, deletedAt: null },
    include: { rol: true },
  });
  if (!existing) throw new HttpError(404, "Usuario no encontrado");

  const data = updateSchema.parse(req.body);
  const esYoMismo = Number(req.user.id) === id;

  // Evitar que el admin se bloquee a sí mismo.
  if (esYoMismo && data.activo === false) {
    throw new HttpError(400, "No puedes desactivar tu propia cuenta");
  }

  const patch = {};
  if (data.username !== undefined) patch.username = data.username;
  if (data.email !== undefined) patch.email = data.email;
  if (data.activo !== undefined) patch.activo = data.activo;
  if (data.password) patch.passwordHash = await bcrypt.hash(data.password, 10);

  if (data.rolId !== undefined) {
    const role = await prisma.role.findFirst({ where: { id: data.rolId, deletedAt: null } });
    if (!role) throw new HttpError(400, "Rol no válido");
    if (esYoMismo && role.nombre !== "ADMIN") {
      throw new HttpError(400, "No puedes quitarte a ti mismo el rol de administrador");
    }
    patch.rolId = data.rolId;
  }

  const user = await prisma.usuario.update({ where: { id }, data: patch, include: { rol: true } });
  res.json({ item: publicUser(user) });
}

export async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, "ID inválido");
  if (Number(req.user.id) === id) throw new HttpError(400, "No puedes eliminar tu propia cuenta");

  const existing = await prisma.usuario.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new HttpError(404, "Usuario no encontrado");

  // Soft delete + desactivar (login comprueba `activo`, así no podrá entrar).
  await prisma.usuario.update({
    where: { id },
    data: { deletedAt: new Date(), activo: false },
  });
  res.status(204).end();
}
