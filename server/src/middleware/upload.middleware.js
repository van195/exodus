import { cloudinaryConfig, requireFileStorage, StorageConfigurationError } from "../config/cloudinary.js";

let upload;

export const singleFileUpload = async (req, res, next) => {
  try {
    requireFileStorage();
    if (!upload) {
      const { default: multer } = await import("multer");
      upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: cloudinaryConfig.maxFileSizeBytes, files: 1 },
      });
    }
  } catch (error) {
    if (error instanceof StorageConfigurationError || error.code === "ERR_MODULE_NOT_FOUND") {
      return res.status(503).json({
        success: false,
        error: { code: "STORAGE_NOT_CONFIGURED", message: "File uploads are unavailable. Configure Cloudinary and install server dependencies." },
      });
    }
    return next(error);
  }
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.name === "MulterError") {
        if (err.code === "LIMIT_FILE_SIZE") {
          const maxMb = Math.round(cloudinaryConfig.maxFileSizeBytes / (1024 * 1024));
          return res.status(413).json({
            success: false,
            error: {
              code: "FILE_TOO_LARGE",
              message: `Uploaded file exceeds the maximum allowed size of ${maxMb} MB.`,
            },
          });
        }
        return res.status(400).json({
          success: false,
          error: {
            code: "MULTER_ERROR",
            message: err.message,
          },
        });
      }
      return res.status(400).json({
        success: false,
        error: {
          code: "UPLOAD_PARSE_ERROR",
          message: err.message || "Failed to process multipart upload.",
        },
      });
    }
    return next();
  });
};
