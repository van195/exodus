import multer from "multer";
import { cloudinaryConfig } from "../config/cloudinary.js";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: cloudinaryConfig.maxFileSizeBytes,
    files: 1,
  },
});

export const singleFileUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
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
