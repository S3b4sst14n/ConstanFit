import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { apiLimiter } from "./middleware/rateLimit.js";

export function createApp() {
  const app = express();

  // Detrás de un proxy (Railway/Vercel) confiamos en X-Forwarded-* para que
  // el rate limit identifique la IP real del cliente, no la del proxy.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", apiLimiter, apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
