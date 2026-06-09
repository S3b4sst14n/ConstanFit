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

// Alcance de gestión según el rol del solicitante: ADMIN gestiona a todos;
// DUEÑO (OWNER) solo puede crear/editar/eliminar cuentas STAFF y CLIENT, nunca
// cuentas ADMIN ni otras OWNER. El servidor es la fuente de verdad de esto.
const GESTIONABLES_POR_ROL = {
  ADMIN: null, // null = sin restricción
  OWNER: new Set(["STAFF", "CLIENT"]),
};

function puedeGestionarRol(solicitante, rolObjetivo) {
  const permitidos = GESTIONABLES_POR_ROL[solicitante];
  if (permitidos === null) return true; // ADMIN
  if (!permitidos) return false; // rol del solicitante no contemplado
  return permitidos.has(rolObjetivo);
}

// Visibilidad en el listado (distinta de la gestión): el DUEÑO (OWNER) no debe
// ver cuentas ADMIN en absoluto. Sigue viendo al resto (incluidas otras OWNER),
// solo que no puede gestionarlas. El servidor es la fuente de verdad.
const ROLES_OCULTOS_POR_ROL = {
  OWNER: ["ADMIN"],
};

export async function list(req, res) {
  const ocultos = ROLES_OCULTOS_POR_ROL[req.user.role] ?? [];
  const items = await prisma.usuario.findMany({
    where: {
      deletedAt: null,
      ...(ocultos.length ? { rol: { nombre: { notIn: ocultos } } } : {}),
    },
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
  if (!puedeGestionarRol(req.user.role, role.nombre)) {
    throw new HttpError(403, "No puedes crear cuentas de ese rol");
  }

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

  // El DUEÑO no puede editar cuentas ADMIN ni otras OWNER.
  if (!puedeGestionarRol(req.user.role, existing.rol?.nombre)) {
    throw new HttpError(403, "No puedes editar esta cuenta");
  }

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
    // El DUEÑO tampoco puede ascender a alguien a ADMIN/OWNER.
    if (!puedeGestionarRol(req.user.role, role.nombre)) {
      throw new HttpError(403, "No puedes asignar ese rol");
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

  const existing = await prisma.usuario.findFirst({
    where: { id, deletedAt: null },
    include: { rol: true },
  });
  if (!existing) throw new HttpError(404, "Usuario no encontrado");

  // El DUEÑO no puede eliminar cuentas ADMIN ni otras OWNER.
  if (!puedeGestionarRol(req.user.role, existing.rol?.nombre)) {
    throw new HttpError(403, "No puedes eliminar esta cuenta");
  }

  // Soft delete + desactivar (login comprueba `activo`, así no podrá entrar).
  await prisma.usuario.update({
    where: { id },
    data: { deletedAt: new Date(), activo: false },
  });
  res.status(204).end();
}
