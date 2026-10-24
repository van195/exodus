import crypto from "node:crypto";
import path from "node:path";
import { cloudinaryConfig } from "../config/cloudinary.js";

export const ALLOWED_CATEGORIES = Object.freeze([
  "PAYMENT_RECEIPT",
  "DELIVERABLE",
  "AGREEMENT",
  "SUPPORTING_EVIDENCE",
]);

const MIME_EXTENSION_MAP = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/zip": [".zip"],
};

const CATEGORY_ALLOWED_MIMES = {
  PAYMENT_RECEIPT: [
    "image/jpeg",
    "image/png",
    "application/pdf",
  ],
  DELIVERABLE: [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ],
  AGREEMENT: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ],
  SUPPORTING_EVIDENCE: [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ],
};

function matchesMagicBytes(buffer, mimeType) {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (mimeType === "application/pdf") {
    return (
      buffer.length >= 5 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d
    );
  }

  // ZIP and DOCX: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (
    mimeType === "application/zip" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
      (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
    );
  }

  return false;
}

export function sanitizeFilename(filename) {
  if (typeof filename !== "string") return "uploaded_file";
  const base = path.basename(filename.replace(/\\/g, "/")).replace(/[\0\r\n]/g, "");
  // Replace non-alphanumeric (except dot, dash, underscore) with underscore
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, "_");
  // Prevent hidden files (e.g. .htaccess)
  const safeName = cleaned.startsWith(".") ? `file${cleaned}` : cleaned;
  return safeName.slice(0, 200) || "uploaded_file";
}

export function calculateChecksum(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function validateUploadedFile(file, category) {
  const errors = {};

  if (!ALLOWED_CATEGORIES.includes(category)) {
    errors.category = `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}`;
  }

  if (!file || !file.buffer || file.buffer.length === 0) {
    errors.file = "No file data received or file is empty.";
    return { isValid: false, errors };
  }

  if (file.buffer.length > cloudinaryConfig.maxFileSizeBytes) {
    const maxMb = Math.round(cloudinaryConfig.maxFileSizeBytes / (1024 * 1024));
    errors.size = `File size exceeds maximum allowed limit of ${maxMb} MB.`;
  }

  const rawExt = path.extname(file.originalname || "").toLowerCase();
  const rawMime = (file.mimetype || "").toLowerCase();

  const allowedMimesForCategory = CATEGORY_ALLOWED_MIMES[category] || [];
  if (!allowedMimesForCategory.includes(rawMime)) {
    errors.type = `MIME type '${rawMime}' is not permitted for category '${category}'.`;
  }

  const validExtensions = MIME_EXTENSION_MAP[rawMime] || [];
  if (!validExtensions.includes(rawExt)) {
    errors.extension = `File extension '${rawExt}' does not match MIME type '${rawMime}'. Expected: ${validExtensions.join(", ")}`;
  }

  if (!errors.type && !matchesMagicBytes(file.buffer, rawMime)) {
    errors.signature = "File contents do not match the expected file signature (corrupted or spoofed file type).";
  }

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    errors,
    sanitizedFilename: sanitizeFilename(file.originalname),
    checksum: isValid ? calculateChecksum(file.buffer) : null,
    resourceType: rawMime.startsWith("image/") ? "image" : "raw",
  };
}
