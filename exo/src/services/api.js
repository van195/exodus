const SESSION_KEY = "exodus_auth_token";
export const API_BASE = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");

export function getToken() {
  return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function saveToken(token, remember) {
  clearSession();
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, token);
}

export function responseError(body, status) {
  if (status === 401 && body?.error?.code === "INVALID_CREDENTIALS") {
    return new Error(body.error.message || "Invalid email or password.");
  }
  if (status === 401) {
    clearSession();
    return new Error("Your session has expired. Please log in again.");
  }
  if (!body && status >= 500) {
    return new Error("The account server could not be reached. Check that the backend is running and try again.");
  }
  const details = body?.error?.details || body?.error?.fields;
  const messages = details ? Object.values(details).filter((value) => typeof value === "string") : [];
  return new Error([body?.error?.message || "The request could not be completed.", ...messages].join(" "));
}

export async function apiRequest(path, { token = getToken(), ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Cannot connect to the server. Check your connection and that the backend is running.", { cause: error });
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) throw responseError(body, response.status);
  return body.data;
}
