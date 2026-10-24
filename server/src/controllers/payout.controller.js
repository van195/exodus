import {
  getPayoutProfile,
  initiatePayout,
  PayoutError,
  savePayoutProfile,
  verifyPayout,
} from "../services/payout.service.js";

function sendError(res, error) {
  if (error instanceof PayoutError) {
    return res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    });
  }

  console.error("Payout controller error:", error);
  return res.status(500).json({
    success: false,
    error: { code: "PAYOUT_SERVER_ERROR", message: error.message || "The request could not be completed." },
  });
}

export async function savePayoutProfileHandler(req, res) {
  try {
    const { bankCode, bankName, accountNumber, accountName } = req.body || {};

    const profile = await savePayoutProfile({
      freelancerId: req.auth.userId,
      bankCode,
      bankName,
      accountNumber,
      accountName,
    });

    return res.status(200).json({
      success: true,
      message: "Payout bank profile saved successfully.",
      data: { profile },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getPayoutProfileHandler(req, res) {
  try {
    const profile = await getPayoutProfile(req.auth.userId);

    return res.status(200).json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function initiatePayoutHandler(req, res) {
  try {
    const { projectId } = req.params;

    const result = await initiatePayout({
      projectId,
      callerId: req.auth.userId,
      callerRole: req.auth.role,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function verifyPayoutHandler(req, res) {
  try {
    const { reference } = req.params;

    const result = await verifyPayout({
      reference,
      callerId: req.auth?.userId || null,
      callerRole: req.auth?.role || null,
    });

    return res.status(200).json({
      success: result.isVerified,
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
}
