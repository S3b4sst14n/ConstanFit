import { Router } from "express";
import authRoutes from "./auth.routes.js";
import plansRoutes from "./plans.routes.js";
import clientesRoutes from "./clientes.routes.js";
import suscripcionesRoutes from "./suscripciones.routes.js";
import pagosRoutes from "./pagos.routes.js";
import asistenciasRoutes from "./asistencias.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/plans", plansRoutes);
router.use("/clientes", clientesRoutes);
router.use("/suscripciones", suscripcionesRoutes);
router.use("/pagos", pagosRoutes);
router.use("/asistencias", asistenciasRoutes);

export default router;
