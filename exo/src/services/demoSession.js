import { clearSession } from "./api.js";

const KEY = "exodus_demo_user";

export function getDemoUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem(KEY));
    return user?.mode === "demo" && ["client", "developer"].includes(user.role) ? user : null;
  } catch { return null; }
}

export function startDemoSession({ name, email, role }) {
  const user = {
    mode: "demo", name: name.trim() || "Test user", email: email.trim(),
    role: role === "developer" ? "developer" : "client",
  };
  sessionStorage.setItem(KEY, JSON.stringify(user));
  clearSession();
  return user;
}

export function clearDemoSession() {
  sessionStorage.removeItem(KEY);
}
