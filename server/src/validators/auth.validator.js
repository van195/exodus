const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[1-9]\d{6,14}$/;
const PUBLIC_ROLES = new Set(["CLIENT", "FREELANCER"]);

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function validateRegistration(body) {
  const input = asObject(body);
  const errors = {};
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";
  const rawPhone = input.phone == null || input.phone === "" ? null : input.phone;
  const phone = typeof rawPhone === "string" ? rawPhone.trim() : rawPhone;
  const role = input.role == null || input.role === "" ? "CLIENT" : typeof input.role === "string" ? input.role.trim().toUpperCase() : "";

  if (!fullName || fullName.length > 150) errors.fullName = "Full name is required and must be at most 150 characters.";
  if (!EMAIL_PATTERN.test(email) || email.length > 320) errors.email = "Enter a valid email address.";
  const passwordBytes = Buffer.byteLength(password, "utf8");
  const passwordIsStrong = password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
  if (!passwordIsStrong || passwordBytes > 72) {
    errors.password = "Password must be 12 or more characters with upper and lower case letters, a number, and a symbol (maximum 72 UTF-8 bytes).";
  }
  if (!confirmPassword) errors.confirmPassword = "Confirm password is required.";
  else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (phone !== null && (typeof phone !== "string" || phone.length > 16 || !PHONE_PATTERN.test(phone))) {
    errors.phone = "Phone must be a valid international number with 7 to 15 digits.";
  }
  if (!PUBLIC_ROLES.has(role)) errors.role = "Role must be CLIENT or FREELANCER.";

  return {
    errors,
    value: { fullName, email, password, phone, role },
  };
}

export function validateLogin(body) {
  const input = asObject(body);
  const errors = {};
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 320) errors.email = "Enter a valid email address.";
  if (!password || Buffer.byteLength(password, "utf8") > 72) errors.password = "Password is required.";
  return { errors, value: { email, password } };
}
