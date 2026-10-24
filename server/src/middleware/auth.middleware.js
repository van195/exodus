import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth.js";
import { getUserRole } from "../services/auth.service.js";

function unauthorized(res) {
  return res.status(401).json({
    success: false,
    error: { code: "UNAUTHENTICATED", message: "Authentication required." },
  });
}

export function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(header);
  if (!match) return unauthorized(res);

  try {
    const payload = jwt.verify(match[1], authConfig.jwtSecret, { algorithms: ["HS256"] });
    if (!payload || typeof payload !== "object" || typeof payload.sub !== "string") return unauthorized(res);
    req.auth = {
      userId: payload.sub,
      role: typeof payload.role === "string" ? payload.role : null,
    };
    return next();
  } catch {
    return unauthorized(res);
  }
}

export function requireRoles(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const role = await getUserRole(req.auth.userId);
      if (!role) return unauthorized(res);
      req.auth.role = role;
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "You do not have permission to access this resource." },
        });
      }
      return next();
    } catch {
      return res.status(500).json({
        success: false,
        error: { code: "AUTHORIZATION_FAILED", message: "The request could not be completed." },
      });
    }
  };
}
