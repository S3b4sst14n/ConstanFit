import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";

const DEFAULT_ROLE = "CLIENT";

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.rol?.nombre ?? null,
  activo: user.activo,
});

function signToken(user) {
  return jwt.sign(
    { role: user.rol?.nombre, username: user.username },
    env.jwt.secret,
    { subject: String(user.id), expiresIn: env.jwt.expiresIn },
  );
}

export async function register({ username, password, email }) {
  const exists = await prisma.usuario.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (exists) {
    throw new HttpError(409, "Ya existe un usuario con ese username o email");
  }

  const role = await prisma.role.findFirst({ where: { nombre: DEFAULT_ROLE } });
  if (!role) {
    throw new HttpError(500, `No existe el rol '${DEFAULT_ROLE}'. Ejecuta el seed.`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.usuario.create({
    data: { username, email, passwordHash, rolId: role.id },
    include: { rol: true },
  });

  return { user: publicUser(user), token: signToken(user) };
}

export async function login({ username, password }) {
  const user = await prisma.usuario.findUnique({
    where: { username },
    include: { rol: true },
  });
  if (!user) throw new HttpError(401, "Credenciales inválidas");
  if (!user.activo) throw new HttpError(403, "Usuario inactivo");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Credenciales inválidas");

  return { user: publicUser(user), token: signToken(user) };
}

export async function me(userId) {
  const user = await prisma.usuario.findUnique({
    where: { id: Number(userId) },
    include: { rol: true },
  });
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  return publicUser(user);
}
