import {
  acceptAgreement,
  acceptDeliverable,
  getProjectActivities,
  LifecycleError,
  openDispute,
  requestRevision,
  submitDeliverable,
} from "../services/project-lifecycle.service.js";

function sendError(res, error) {
  if (error instanceof LifecycleError) {
    return res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    });
  }

  console.error("Lifecycle controller error:", error);
  return res.status(500).json({
    success: false,
    error: { code: "LIFECYCLE_SERVER_ERROR", message: error.message || "The request could not be completed." },
  });
}

export async function acceptAgreementHandler(req, res) {
  try {
    const { projectId } = req.params;
    const project = await acceptAgreement({
      projectId,
      userId: req.auth.userId,
      userRole: req.auth.role,
    });

    return res.status(200).json({
      success: true,
      message: "Agreement accepted. Project is ready for payment.",
      data: { project },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function submitDeliverableHandler(req, res) {
  try {
    const { projectId } = req.params;
    const { notes } = req.body || {};

    const project = await submitDeliverable({
      projectId,
      userId: req.auth.userId,
      userRole: req.auth.role,
      notes,
    });

    return res.status(200).json({
      success: true,
      message: "Deliverable submitted. Project moved to client review.",
      data: { project },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function acceptDeliverableHandler(req, res) {
  try {
    const { projectId } = req.params;
    const { notes } = req.body || {};

    const project = await acceptDeliverable({
      projectId,
      userId: req.auth.userId,
      userRole: req.auth.role,
      notes,
    });

    return res.status(200).json({
      success: true,
      message: "Deliverables approved. Fund release authorized.",
      data: { project },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function requestRevisionHandler(req, res) {
  try {
    const { projectId } = req.params;
    const { reason } = req.body || {};

    const project = await requestRevision({
      projectId,
      userId: req.auth.userId,
      userRole: req.auth.role,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: "Revision requested successfully.",
      data: { project },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function openDisputeHandler(req, res) {
  try {
    const { projectId } = req.params;
    const { reason } = req.body || {};

    const project = await openDispute({
      projectId,
      userId: req.auth.userId,
      userRole: req.auth.role,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: "Dispute opened. Escrow funds and payouts are frozen.",
      data: { project },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getProjectActivitiesHandler(req, res) {
  try {
    const { projectId } = req.params;
    const activities = await getProjectActivities(
      projectId,
      req.auth.userId,
      req.auth.role
    );

    return res.status(200).json({
      success: true,
      data: { activities },
    });
  } catch (error) {
    return sendError(res, error);
  }
}
