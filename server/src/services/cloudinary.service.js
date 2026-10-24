import { Readable } from "node:stream";
import path from "node:path";
import { cloudinary, cloudinaryConfig, requireFileStorage } from "../config/cloudinary.js";

/**
 * Upload a memory buffer to Cloudinary using streaming.
 * Never writes file to server filesystem.
 */
export function uploadBufferStream(buffer, {
  folder = "trust-payment/escrow",
  resourceType = "raw",
  deliveryType = cloudinaryConfig.deliveryType,
  originalFilename = "file",
} = {}) {
  requireFileStorage();
  return new Promise((resolve, reject) => {
    // Generate an unguessable public_id server-side to prevent user control over public_id
    const safeBase = path.parse(originalFilename).name.slice(0, 50);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const publicId = `${folder}/${safeBase}-${uniqueSuffix}`;

    const uploadOptions = {
      public_id: publicId,
      resource_type: resourceType,
      type: deliveryType,
      overwrite: false,
      use_filename: false,
      unique_filename: true,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });
}

/**
 * Delete asset from Cloudinary.
 */
export async function deleteCloudinaryAsset(publicId, resourceType = "raw", deliveryType = cloudinaryConfig.deliveryType) {
  requireFileStorage();
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: deliveryType,
      invalidate: true,
    });
    return result;
  } catch (error) {
    console.error("Failed to delete Cloudinary asset:", {
      publicId,
      message: error?.message,
    });
    throw error;
  }
}

/**
 * Generate a short-lived secure signed URL for authorized access/download.
 */
export function generateSecureAccessUrl({
  publicId,
  resourceType = "raw",
  deliveryType = cloudinaryConfig.deliveryType,
  originalFilename = "",
  expiresInSeconds = 3600,
}) {
  requireFileStorage();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const ext = path.extname(originalFilename).replace(/^\./, "");

  try {
    if (deliveryType === "authenticated" || deliveryType === "private") {
      if (resourceType === "raw") {
        return cloudinary.utils.private_download_url(publicId, ext || "", {
          resource_type: "raw",
          type: deliveryType,
          expires_at: expiresAt,
        });
      }
      return cloudinary.utils.url(publicId, {
        sign_url: true,
        type: deliveryType,
        resource_type: resourceType,
        secure: true,
        expires_at: expiresAt,
      });
    }

    // Standard upload type with signature
    return cloudinary.utils.url(publicId, {
      sign_url: true,
      secure: true,
      resource_type: resourceType,
      type: deliveryType,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error("Signed URL generation warning:", err?.message);
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: resourceType,
      type: deliveryType,
    });
  }
}
