import { Router } from "express";
import * as plansController from "../controllers/plans.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

// Lectura pública
router.get("/", asyncHandler(plansController.list));
router.get("/:id", asyncHandler(plansController.get));

// Escritura: ADMIN y DUEÑO (gestionan los planes del gym)
const admin = [requireAuth, requireRole("ADMIN", "OWNER")];
router.post("/", ...admin, asyncHandler(plansController.create));
router.put("/:id", ...admin, asyncHandler(plansController.update));
router.delete("/:id", ...admin, asyncHandler(plansController.remove));

export default router;
