import rateLimit from "express-rate-limit";

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // 30 uploads per 15 minutes per IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler(_req, res) {
    return res.status(429).json({
      success: false,
      error: {
        code: "UPLOAD_RATE_LIMITED",
        message: "Too many file upload requests. Please try again later.",
      },
    });
  },
});
