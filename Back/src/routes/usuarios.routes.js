import { Router } from "express";
import * as ctrl from "../controllers/usuarios.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();
// Gestión de usuarios: solo ADMIN (no STAFF).
const admin = [requireAuth, requireRole("ADMIN")];

router.get("/", ...admin, asyncHandler(ctrl.list));
router.get("/roles", ...admin, asyncHandler(ctrl.roles));
router.post("/", ...admin, asyncHandler(ctrl.create));
router.put("/:id", ...admin, asyncHandler(ctrl.update));
router.delete("/:id", ...admin, asyncHandler(ctrl.remove));

export default router;
