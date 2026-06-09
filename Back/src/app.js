import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { httpLogger } from "./lib/logger.js";

export function createApp() {
  const app = express();

  // Detrás de un proxy (Railway/Vercel) confiamos en X-Forwarded-* para que
  // el rate limit identifique la IP real del cliente, no la del proxy.
  app.set("trust proxy", 1);

  // Log por petición (req.log + id) antes que nada, para registrar también las
  // respuestas de rate limit y CORS.
  app.use(httpLogger);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", apiLimiter, apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
