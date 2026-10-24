import { Router } from "express";
import {
  getBanksHandler,
  getProjectPaymentsHandler,
  initiatePaymentHandler,
  verifyPaymentHandler,
  webhookHandler,
} from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Webhook endpoint (Public, verified cryptographically via HMAC SHA-256)
router.post("/webhook", webhookHandler);

// Protected payment endpoints
router.post("/initialize", requireAuth, initiatePaymentHandler);
router.get("/banks", requireAuth, getBanksHandler);
router.get("/project/:projectId", requireAuth, getProjectPaymentsHandler);
router.get("/verify/:txRef", requireAuth, verifyPaymentHandler);
router.get("/:paymentId/verify", requireAuth, verifyPaymentHandler);

export default router;
