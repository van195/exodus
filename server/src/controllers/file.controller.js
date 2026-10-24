import {
  deleteProjectFile,
  FileServiceError,
  getFileMetadata,
  listProjectFiles,
  uploadProjectFile,
} from "../services/file.service.js";
import { ProjectError } from "../services/project.service.js";
import { StorageConfigurationError } from "../config/cloudinary.js";

function sendError(res, error) {
  if (error instanceof FileServiceError || error instanceof ProjectError || error instanceof StorageConfigurationError) {
    return res.status(error.status).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  console.error("Unhandled file controller error:", error);
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "The request could not be completed.",
    },
  });
}

export async function uploadReceipt(req, res) {
  try {
    const { projectId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_FILE", message: "Please provide a receipt file in the 'file' field." },
      });
    }

    const result = await uploadProjectFile({
      projectId,
      uploaderId: req.auth.userId,
      userRole: req.auth.role,
      category: "PAYMENT_RECEIPT",
      file,
    });

    return res.status(201).json({
      success: true,
      message: "Payment receipt uploaded successfully. Note: Payment verification is handled separately.",
      data: { file: result },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function uploadDeliverable(req, res) {
  try {
    const { projectId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_FILE", message: "Please provide a deliverable file in the 'file' field." },
      });
    }

    const result = await uploadProjectFile({
      projectId,
      uploaderId: req.auth.userId,
      userRole: req.auth.role,
      category: "DELIVERABLE",
      file,
    });

    return res.status(201).json({
      success: true,
      message: "Deliverable uploaded successfully.",
      data: { file: result },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function uploadAgreement(req, res) {
  try {
    const { projectId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_FILE", message: "Please provide an agreement file in the 'file' field." },
      });
    }

    const result = await uploadProjectFile({
      projectId,
      uploaderId: req.auth.userId,
      userRole: req.auth.role,
      category: "AGREEMENT",
      file,
    });

    return res.status(201).json({
      success: true,
      message: "Agreement uploaded successfully.",
      data: { file: result },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function uploadEvidence(req, res) {
  try {
    const { projectId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_FILE", message: "Please provide an evidence file in the 'file' field." },
      });
    }

    const result = await uploadProjectFile({
      projectId,
      uploaderId: req.auth.userId,
      userRole: req.auth.role,
      category: "SUPPORTING_EVIDENCE",
      file,
    });

    return res.status(201).json({
      success: true,
      message: "Supporting evidence uploaded successfully.",
      data: { file: result },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function uploadGenericFile(req, res) {
  try {
    const { projectId } = req.params;
    const category = (req.body?.category || req.query?.category || "").toUpperCase();
    const file = req.file;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_CATEGORY",
          message: "Please specify a category (PAYMENT_RECEIPT, DELIVERABLE, AGREEMENT, SUPPORTING_EVIDENCE).",
        },
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_FILE", message: "Please provide a file in the 'file' field." },
      });
    }

    const result = await uploadProjectFile({
      projectId,
      uploaderId: req.auth.userId,
      userRole: req.auth.role,
      category,
      file,
    });

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully.",
      data: { file: result },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function listFiles(req, res) {
  try {
    const { projectId } = req.params;
    const fileList = await listProjectFiles(projectId, req.auth.userId, req.auth.role);

    return res.status(200).json({
      success: true,
      data: { files: fileList },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getFile(req, res) {
  try {
    const { fileId } = req.params;
    const metadata = await getFileMetadata(fileId, req.auth.userId, req.auth.role);

    return res.status(200).json({
      success: true,
      data: { file: metadata },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function downloadFile(req, res) {
  try {
    const { fileId } = req.params;
    const metadata = await getFileMetadata(fileId, req.auth.userId, req.auth.role);

    // Redirect to short-lived signed access URL
    return res.redirect(302, metadata.accessUrl);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteFile(req, res) {
  try {
    const { fileId } = req.params;
    const result = await deleteProjectFile(fileId, req.auth.userId, req.auth.role);

    return res.status(200).json({
      success: true,
      message: "File deleted successfully.",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
}
