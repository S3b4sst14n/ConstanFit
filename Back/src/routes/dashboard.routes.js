import { Router } from "express";
import * as ctrl from "../controllers/dashboard.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();
const staff = [requireAuth, requireRole("ADMIN", "OWNER", "STAFF")];

router.get("/", ...staff, asyncHandler(ctrl.overview));

export default router;
