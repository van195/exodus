import {
  getProjectPayments,
  initializePayment,
  PaymentError,
  verifyPayment,
} from "../services/payment.service.js";
import { getChapaSupportedBanks } from "../services/chapa.service.js";
import { processWebhook } from "../services/webhook.service.js";

function sendError(res, error) {
  if (error instanceof PaymentError) {
    return res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    });
  }

  console.error("Payment controller error:", error);
  return res.status(500).json({
    success: false,
    error: { code: "PAYMENT_SERVER_ERROR", message: error.message || "The request could not be completed." },
  });
}

export async function initiatePaymentHandler(req, res) {
  try {
    const { projectId } = req.body || {};

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_PROJECT_ID", message: "projectId is required in request body." },
      });
    }

    const result = await initializePayment({
      projectId,
      clientId: req.auth.userId,
      userEmail: req.auth.email,
      userFullName: req.auth.fullName,
    });

    return res.status(200).json({
      success: true,
      message: result.isReused ? "Active checkout session resumed." : "Checkout initialized successfully.",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function verifyPaymentHandler(req, res) {
  try {
    const { paymentId, txRef } = req.params;

    const result = await verifyPayment({
      paymentId,
      txRef,
      requestingUserId: req.auth?.userId || null,
      requestingUserRole: req.auth?.role || null,
    });

    return res.status(200).json({
      success: result.isVerified,
      message: result.message,
      data: result.payment,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function webhookHandler(req, res) {
  try {
    const signature =
      req.get("x-chapa-signature") ||
      req.get("chapa-signature") ||
      req.get("signature") ||
      "";

    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

    const result = await processWebhook({
      rawBody,
      signature,
      payload: req.body,
    });

    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error("Chapa webhook handling failed:", error);
    return res.status(500).json({ success: false, error: "WEBHOOK_FAILED" });
  }
}

export async function getBanksHandler(_req, res) {
  try {
    const banks = await getChapaSupportedBanks();
    return res.status(200).json({
      success: true,
      data: { banks },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getProjectPaymentsHandler(req, res) {
  try {
    const { projectId } = req.params;
    const paymentsList = await getProjectPayments(projectId, req.auth.userId, req.auth.role);

    return res.status(200).json({
      success: true,
      data: { payments: paymentsList },
    });
  } catch (error) {
    return sendError(res, error);
  }
}
