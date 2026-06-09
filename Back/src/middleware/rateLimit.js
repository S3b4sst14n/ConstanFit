import rateLimit from "express-rate-limit";

// Limita los intentos contra los endpoints sensibles de autenticación
// (login/register) para frenar fuerza bruta y credential stuffing.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10, // 10 intentos por IP en la ventana
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Demasiados intentos. Inténtalo de nuevo en unos minutos.",
  },
});

// Límite general, más holgado, para el resto de la API.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.",
  },
});
