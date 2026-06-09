import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

router.post("/register", authLimiter, asyncHandler(authController.register));
router.post("/login", authLimiter, asyncHandler(authController.login));
router.get("/me", requireAuth, asyncHandler(authController.me));

export default router;
