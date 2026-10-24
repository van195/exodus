import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName) {
  throw new Error("CLOUDINARY_CLOUD_NAME must be configured");
}

if (!apiKey) {
  throw new Error("CLOUDINARY_API_KEY must be configured");
}

if (!apiSecret) {
  throw new Error("CLOUDINARY_API_SECRET must be configured");
}

const maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024);
if (!Number.isFinite(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
  throw new Error("MAX_FILE_SIZE_BYTES must be a positive integer");
}

// Delivery type: "authenticated", "private", or "upload"
// Default to "authenticated" for private escrow files. If an account is on a free plan
// that disallows authenticated delivery, CLOUDINARY_DELIVERY_TYPE can be configured in .env.
const deliveryType = process.env.CLOUDINARY_DELIVERY_TYPE || "authenticated";

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export const cloudinaryConfig = Object.freeze({
  cloudName,
  apiKey,
  apiSecret,
  maxFileSizeBytes,
  deliveryType,
});

export { cloudinary };
