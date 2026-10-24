import { Router } from "express";
import { login, me, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { loginLimiter, registrationLimiter } from "../middleware/auth.rate-limit.js";

const router = Router();
router.post("/register", registrationLimiter, register);
router.post("/login", loginLimiter, login);
router.get("/me", requireAuth, me);

export default router;
