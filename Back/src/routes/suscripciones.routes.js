import { Router } from "express";
import * as ctrl from "../controllers/suscripciones.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();
const staff = [requireAuth, requireRole("ADMIN", "STAFF")];

router.get("/", ...staff, asyncHandler(ctrl.list));
router.get("/:id", ...staff, asyncHandler(ctrl.get));
router.post("/", ...staff, asyncHandler(ctrl.create));
router.put("/:id", ...staff, asyncHandler(ctrl.update));
router.delete("/:id", ...staff, asyncHandler(ctrl.remove));

export default router;
