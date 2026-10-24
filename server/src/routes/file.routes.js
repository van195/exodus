import { Router } from "express";
import {
  deleteFile,
  downloadFile,
  getFile,
} from "../controllers/file.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Require JWT authentication on all file endpoints
router.use(requireAuth);

router.get("/:fileId", getFile);
router.get("/:fileId/download", downloadFile);
router.delete("/:fileId", deleteFile);

export default router;
