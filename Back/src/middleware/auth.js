import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "Falta el token de autenticación"));
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = { id: payload.sub, role: payload.role, username: payload.username };
    next();
  } catch {
    next(new HttpError(401, "Token inválido o expirado"));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "No autenticado"));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "Permiso insuficiente"));
    }
    next();
  };
}
