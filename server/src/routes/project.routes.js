import { Router } from "express";
import {
  createNewProject,
  getProject,
  getProjects,
} from "../controllers/project.controller.js";
import {
  listFiles,
  uploadAgreement,
  uploadDeliverable,
  uploadEvidence,
  uploadGenericFile,
  uploadReceipt,
} from "../controllers/file.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { singleFileUpload } from "../middleware/upload.middleware.js";
import { uploadLimiter } from "../middleware/file.rate-limit.js";

const router = Router();

// Require JWT authentication on all project and upload endpoints
router.use(requireAuth);

// Project management endpoints
router.post("/", createNewProject);
router.get("/", getProjects);
router.get("/:projectId", getProject);

// Project file listing
router.get("/:projectId/files", listFiles);

// Category-specific upload endpoints
router.post("/:projectId/files/receipt", uploadLimiter, singleFileUpload, uploadReceipt);
router.post("/:projectId/files/deliverable", uploadLimiter, singleFileUpload, uploadDeliverable);
router.post("/:projectId/files/agreement", uploadLimiter, singleFileUpload, uploadAgreement);
router.post("/:projectId/files/evidence", uploadLimiter, singleFileUpload, uploadEvidence);

// Generic upload endpoint with category in body
router.post("/:projectId/files", uploadLimiter, singleFileUpload, uploadGenericFile);

export default router;
