import {
  AuthError,
  getCurrentUser,
  loginUser,
  registerUser,
} from "../services/auth.service.js";
import { validateLogin, validateRegistration } from "../validators/auth.validator.js";

function sendError(res, error) {
  if (error instanceof AuthError) {
    return res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "The request could not be completed." },
  });
}

export async function register(req, res) {
  const { errors, value } = validateRegistration(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Please check the registration details.", fields: errors },
    });
  }

  try {
    const user = await registerUser(value);
    return res.status(201).json({ success: true, message: "Registration successful", data: { user } });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function login(req, res) {
  const { errors, value } = validateLogin(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Please check the login details.", fields: errors },
    });
  }

  try {
    const result = await loginUser(value);
    return res.status(200).json({ success: true, message: "Login successful", data: result });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function me(req, res) {
  try {
    const user = await getCurrentUser(req.auth.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required." } });
    }
    return res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    return sendError(res, error);
  }
}
