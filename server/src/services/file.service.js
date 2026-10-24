import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { files } from "../db/schema.js";
import { cloudinaryConfig } from "../config/cloudinary.js";
import {
  deleteCloudinaryAsset,
  generateSecureAccessUrl,
  uploadBufferStream,
} from "./cloudinary.service.js";
import { verifyProjectAccess } from "./project.service.js";
import { validateUploadedFile } from "../validators/file.validator.js";

export class FileServiceError extends Error {
  constructor(message, status, code, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Uploads a file to Cloudinary and saves its metadata to PostgreSQL.
 * If the database insert fails, the Cloudinary asset is automatically cleaned up.
 */
export async function uploadProjectFile({
  projectId,
  uploaderId,
  userRole,
  category,
  file,
}) {
  // 1. Verify project membership and category upload permissions
  await verifyProjectAccess(projectId, uploaderId, userRole, category);

  // 2. Validate file integrity, size, MIME type, and magic bytes
  const validation = validateUploadedFile(file, category);
  if (!validation.isValid) {
    throw new FileServiceError(
      "File validation failed.",
      400,
      "VALIDATION_ERROR",
      validation.errors
    );
  }

  // 3. Upload to Cloudinary via stream
  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadBufferStream(file.buffer, {
      folder: `trust-payment/projects/${projectId}`,
      resourceType: validation.resourceType,
      deliveryType: cloudinaryConfig.deliveryType,
      originalFilename: validation.sanitizedFilename,
    });
  } catch (cloudErr) {
    console.error("Cloudinary upload failed:", cloudErr?.message);
    throw new FileServiceError(
      "Failed to upload file to storage provider.",
      502,
      "STORAGE_UPLOAD_FAILED"
    );
  }

  // 4. Save metadata to database with rollback protection
  let savedRecord;
  try {
    const [inserted] = await db
      .insert(files)
      .values({
        projectId,
        uploaderId,
        category,
        originalFilename: validation.sanitizedFilename,
        cloudinaryAssetId: cloudinaryResult.asset_id || null,
        cloudinaryPublicId: cloudinaryResult.public_id,
        resourceType: cloudinaryResult.resource_type || validation.resourceType,
        deliveryType: cloudinaryResult.type || cloudinaryConfig.deliveryType,
        mimeType: file.mimetype.toLowerCase(),
        fileSize: file.buffer.length,
        checksum: validation.checksum,
      })
      .returning();

    savedRecord = inserted;
  } catch (dbErr) {
    console.error("Database save failed. Cleaning up Cloudinary asset...", dbErr?.message);
    try {
      await deleteCloudinaryAsset(
        cloudinaryResult.public_id,
        cloudinaryResult.resource_type || validation.resourceType,
        cloudinaryResult.type || cloudinaryConfig.deliveryType
      );
    } catch (cleanupErr) {
      console.error("Cloudinary cleanup failed after DB error:", cleanupErr?.message);
    }

    throw new FileServiceError(
      "Failed to save file metadata to database.",
      500,
      "METADATA_SAVE_FAILED"
    );
  }

  // 5. Generate secure signed URL for access
  const accessUrl = generateSecureAccessUrl({
    publicId: savedRecord.cloudinaryPublicId,
    resourceType: savedRecord.resourceType,
    deliveryType: savedRecord.deliveryType,
    originalFilename: savedRecord.originalFilename,
  });

  return {
    ...savedRecord,
    accessUrl,
  };
}

/**
 * List all files belonging to a specific project.
 */
export async function listProjectFiles(projectId, userId, userRole) {
  // Ensure requesting user has access to the project
  await verifyProjectAccess(projectId, userId, userRole);

  const fileRecords = await db
    .select()
    .from(files)
    .where(eq(files.projectId, projectId));

  return fileRecords.map((f) => ({
    ...f,
    accessUrl: generateSecureAccessUrl({
      publicId: f.cloudinaryPublicId,
      resourceType: f.resourceType,
      deliveryType: f.deliveryType,
      originalFilename: f.originalFilename,
    }),
  }));
}

/**
 * Retrieve a single file's metadata and generate an authorized access URL.
 */
export async function getFileMetadata(fileId, userId, userRole) {
  const [fileRecord] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  if (!fileRecord) {
    throw new FileServiceError("File not found.", 404, "FILE_NOT_FOUND");
  }

  // Ensure user has access to the parent project
  await verifyProjectAccess(fileRecord.projectId, userId, userRole);

  const accessUrl = generateSecureAccessUrl({
    publicId: fileRecord.cloudinaryPublicId,
    resourceType: fileRecord.resourceType,
    deliveryType: fileRecord.deliveryType,
    originalFilename: fileRecord.originalFilename,
  });

  return {
    ...fileRecord,
    accessUrl,
  };
}

/**
 * Delete a file from database and Cloudinary.
 * Only the original uploader or an administrator can delete.
 */
export async function deleteProjectFile(fileId, userId, userRole) {
  const [fileRecord] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  if (!fileRecord) {
    throw new FileServiceError("File not found.", 404, "FILE_NOT_FOUND");
  }

  const isUploader = fileRecord.uploaderId === userId;
  const isAdmin = userRole === "ADMIN";

  if (!isUploader && !isAdmin) {
    throw new FileServiceError(
      "You do not have permission to delete this file. Only the uploader or an administrator can delete files.",
      403,
      "FORBIDDEN"
    );
  }

  // Delete from Cloudinary
  try {
    await deleteCloudinaryAsset(
      fileRecord.cloudinaryPublicId,
      fileRecord.resourceType,
      fileRecord.deliveryType
    );
  } catch (cloudErr) {
    console.warn("Could not delete file from Cloudinary (may already be removed):", cloudErr?.message);
  }

  // Delete from database
  await db.delete(files).where(eq(files.id, fileId));

  return {
    id: fileId,
    deleted: true,
  };
}
