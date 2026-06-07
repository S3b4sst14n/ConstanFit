import { ZodError } from "zod";
import { HttpError } from "../lib/httpError.js";

export function notFound(req, res) {
  res.status(404).json({ error: "Recurso no encontrado" });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Datos inválidos",
      details: err.flatten(),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Prisma: violación de restricción única (p. ej. documento o correo repetido).
  if (err?.code === "P2002") {
    return res.status(409).json({
      error: "Ya existe un registro con ese dato único (correo o documento).",
    });
  }

  console.error("[unhandled]", err);
  res.status(500).json({ error: "Error interno del servidor" });
}
