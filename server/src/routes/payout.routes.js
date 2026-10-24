import { Router } from "express";
import {
  getPayoutProfileHandler,
  initiatePayoutHandler,
  savePayoutProfileHandler,
  verifyPayoutHandler,
} from "../controllers/payout.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.post("/profile", savePayoutProfileHandler);
router.get("/profile", getPayoutProfileHandler);
router.post("/project/:projectId", initiatePayoutHandler);
router.get("/verify/:reference", verifyPayoutHandler);

export default router;
