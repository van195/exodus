import "dotenv/config";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// File storage is optional at startup; authentication and project routes can
// run before storage credentials are provisioned.
let cloudinary = null;
if (cloudName && apiKey && apiSecret) {
  try {
    ({ v2: cloudinary } = await import("cloudinary"));
  } catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
  }
}

export class StorageConfigurationError extends Error {
  constructor() {
    super("File storage is unavailable. Configure Cloudinary credentials and install server dependencies.");
    this.status = 503;
    this.code = "STORAGE_NOT_CONFIGURED";
  }
}

export function requireFileStorage() {
  if (!cloudinary) throw new StorageConfigurationError();
}

const maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024);
if (!Number.isFinite(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
  throw new Error("MAX_FILE_SIZE_BYTES must be a positive integer");
}

// Delivery type: "authenticated", "private", or "upload"
// Default to "authenticated" for private escrow files. If an account is on a free plan
// that disallows authenticated delivery, CLOUDINARY_DELIVERY_TYPE can be configured in .env.
const deliveryType = process.env.CLOUDINARY_DELIVERY_TYPE || "authenticated";

cloudinary?.config({
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
