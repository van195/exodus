import { API_BASE, apiRequest, getToken, responseError } from "./api.js";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_FILES = ".zip,.pdf,.docx,.png,.jpg,.jpeg";
const TYPES = {
  zip: "application/zip", pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
};

export function validateDeliverable(file) {
  if (!file || file.size === 0) return "Choose a non-empty file.";
  if (file.size > MAX_FILE_SIZE) return "The file must be 10 MB or smaller.";
  const expected = TYPES[file.name.split(".").pop().toLowerCase()];
  if (!expected) return "Choose a ZIP, PDF, DOCX, PNG, or JPEG file.";
  if (file.type && file.type !== expected) return "The file type does not match its extension.";
  return "";
}

export function canSubmitDeliverable(user, project, files) {
  return Boolean(user?.id && user.role === "FREELANCER"
    && project?.freelancerId === user.id
    && ["ACTIVE", "IN_ESCROW"].includes(project.status)
    && !files.some((file) => file.category === "DELIVERABLE"));
}

export const listDeliverables = async (projectId, signal) => {
  const data = await apiRequest(`/projects/${encodeURIComponent(projectId)}/files`, { signal });
  if (!Array.isArray(data?.files)) throw new Error("Could not load submitted files.");
  return data.files.filter((file) => file.category === "DELIVERABLE");
};

export function uploadDeliverable(projectId, file, onProgress, signal) {
  const error = validateDeliverable(file);
  if (error) return Promise.reject(new Error(error));
  const token = getToken();
  if (!token) return Promise.reject(new Error("Please log in before uploading work."));
  // Normalize missing browser MIME metadata to the backend's extension/MIME contract.
  const mime = TYPES[file.name.split(".").pop().toLowerCase()];
  const form = new FormData();
  form.append("file", new Blob([file], { type: mime }), file.name);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener("abort", abort);
    xhr.open("POST", `${API_BASE}/projects/${encodeURIComponent(projectId)}/files/deliverable`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.timeout = 120000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100));
    };
    xhr.onload = () => {
      cleanup();
      let body;
      try { body = JSON.parse(xhr.responseText); } catch { /* handled below */ }
      if (xhr.status < 200 || xhr.status >= 300 || body?.success !== true) {
        reject(responseError(body, xhr.status));
      } else if (!body.data?.file?.id) {
        reject(new Error("The server did not confirm the uploaded file. Refresh before trying again."));
      } else resolve(body.data.file);
    };
    xhr.onerror = xhr.ontimeout = () => {
      cleanup();
      reject(new Error("Connection lost. Refresh the submitted files before trying again."));
    };
    xhr.onabort = () => { cleanup(); reject(new Error("Upload interrupted. Refresh before trying again.")); };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { cleanup(); reject(new Error("Upload cancelled.")); return; }
    xhr.send(form);
  });
}

export async function getDownloadUrl(fileId) {
  const data = await apiRequest(`/files/${encodeURIComponent(fileId)}`);
  const url = new URL(data?.file?.accessUrl);
  if (url.protocol !== "https:") throw new Error("The server returned an invalid download link.");
  return url.href;
}
