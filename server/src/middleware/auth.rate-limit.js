import rateLimit from "express-rate-limit";

function makeLimiter({ windowMs, limit, code, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler(_req, res) {
      return res.status(429).json({ success: false, error: { code, message } });
    },
  });
}

export const registrationLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  code: "REGISTRATION_RATE_LIMITED",
  message: "Too many registration attempts. Please try again later.",
});

export const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  code: "LOGIN_RATE_LIMITED",
  message: "Too many login attempts. Please try again later.",
});
