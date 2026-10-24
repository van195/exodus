import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import {
  ALLOWED_CATEGORIES,
  calculateChecksum,
  sanitizeFilename,
  validateUploadedFile,
} from "../src/validators/file.validator.js";
import { authConfig } from "../src/config/auth.js";
import app from "../src/app.js";

// Sample valid buffers with correct magic bytes
const validPngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const validJpegBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);
const validPdfBuffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj");
const validZipBuffer = Buffer.from([
  0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00,
]);
const fakePngBuffer = Buffer.from("This is plain text pretending to be an image");

function makeTestToken(userId, role = "CLIENT") {
  return jwt.sign(
    { role },
    authConfig.jwtSecret,
    { algorithm: "HS256", subject: userId, expiresIn: "1h" }
  );
}

test("File Validation Unit Tests", async (t) => {
  await t.test("accepts valid PNG receipt", () => {
    const file = {
      originalname: "receipt.png",
      mimetype: "image/png",
      buffer: validPngBuffer,
    };
    const result = validateUploadedFile(file, "PAYMENT_RECEIPT");
    assert.equal(result.isValid, true);
    assert.equal(result.resourceType, "image");
    assert.equal(result.sanitizedFilename, "receipt.png");
    assert.equal(result.checksum, calculateChecksum(validPngBuffer));
  });

  await t.test("accepts valid JPEG deliverable", () => {
    const file = {
      originalname: "final-render.jpg",
      mimetype: "image/jpeg",
      buffer: validJpegBuffer,
    };
    const result = validateUploadedFile(file, "DELIVERABLE");
    assert.equal(result.isValid, true);
    assert.equal(result.resourceType, "image");
  });

  await t.test("accepts valid PDF agreement", () => {
    const file = {
      originalname: "escrow_agreement.pdf",
      mimetype: "application/pdf",
      buffer: validPdfBuffer,
    };
    const result = validateUploadedFile(file, "AGREEMENT");
    assert.equal(result.isValid, true);
    assert.equal(result.resourceType, "raw");
  });

  await t.test("accepts valid ZIP for deliverable and supporting evidence", () => {
    const file = {
      originalname: "deliverables_v1.zip",
      mimetype: "application/zip",
      buffer: validZipBuffer,
    };
    const deliverableResult = validateUploadedFile(file, "DELIVERABLE");
    assert.equal(deliverableResult.isValid, true);

    const evidenceResult = validateUploadedFile(file, "SUPPORTING_EVIDENCE");
    assert.equal(evidenceResult.isValid, true);
  });

  await t.test("rejects ZIP for payment receipt", () => {
    const file = {
      originalname: "receipt.zip",
      mimetype: "application/zip",
      buffer: validZipBuffer,
    };
    const result = validateUploadedFile(file, "PAYMENT_RECEIPT");
    assert.equal(result.isValid, false);
    assert.ok(result.errors.type);
  });

  await t.test("detects spoofed file extension via magic bytes", () => {
    const file = {
      originalname: "malicious.png",
      mimetype: "image/png",
      buffer: fakePngBuffer, // Plain text pretending to be PNG
    };
    const result = validateUploadedFile(file, "PAYMENT_RECEIPT");
    assert.equal(result.isValid, false);
    assert.ok(result.errors.signature);
  });

  await t.test("rejects mismatched extension and MIME type", () => {
    const file = {
      originalname: "receipt.exe",
      mimetype: "image/png",
      buffer: validPngBuffer,
    };
    const result = validateUploadedFile(file, "PAYMENT_RECEIPT");
    assert.equal(result.isValid, false);
    assert.ok(result.errors.extension);
  });

  await t.test("rejects empty file", () => {
    const file = {
      originalname: "empty.png",
      mimetype: "image/png",
      buffer: Buffer.alloc(0),
    };
    const result = validateUploadedFile(file, "PAYMENT_RECEIPT");
    assert.equal(result.isValid, false);
    assert.ok(result.errors.file);
  });

  await t.test("rejects invalid upload category", () => {
    const file = {
      originalname: "receipt.png",
      mimetype: "image/png",
      buffer: validPngBuffer,
    };
    const result = validateUploadedFile(file, "INVALID_CATEGORY");
    assert.equal(result.isValid, false);
    assert.ok(result.errors.category);
  });

  await t.test("sanitizes path traversal and control characters in filename", () => {
    const dangerous = "../../../etc/passwd..png";
    const clean = sanitizeFilename(dangerous);
    assert.equal(clean.includes("/"), false);
    assert.equal(clean.includes("\\"), false);
    assert.equal(clean.includes(".."), false);
  });
});

test("File & Project API Security Integration Tests", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const dummyToken = makeTestToken(randomUUID(), "CLIENT");

  await t.test("GET /api/projects without token returns 401 UNAUTHENTICATED", async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });

  await t.test("GET /api/projects/:id/files without token returns 401", async () => {
    const fakeId = randomUUID();
    const res = await fetch(`${baseUrl}/api/projects/${fakeId}/files`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });

  await t.test("GET /api/files/:fileId without token returns 401", async () => {
    const fakeId = randomUUID();
    const res = await fetch(`${baseUrl}/api/files/${fakeId}`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });

  await t.test("DELETE /api/files/:fileId without token returns 401", async () => {
    const fakeId = randomUUID();
    const res = await fetch(`${baseUrl}/api/files/${fakeId}`, { method: "DELETE" });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });

  await t.test("POST /api/projects/:id/files/receipt without file returns 400 MISSING_FILE", async () => {
    const fakeProjectId = randomUUID();
    const formData = new FormData();
    // Do not attach any file

    const res = await fetch(`${baseUrl}/api/projects/${fakeProjectId}/files/receipt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${dummyToken}` },
      body: formData,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "MISSING_FILE");
  });

  await t.test("POST /api/projects/:id/files with non-existent project returns 404 PROJECT_NOT_FOUND", async () => {
    const nonExistentProjectId = randomUUID();
    const formData = new FormData();
    const blob = new Blob([validPngBuffer], { type: "image/png" });
    formData.append("file", blob, "receipt.png");

    const res = await fetch(`${baseUrl}/api/projects/${nonExistentProjectId}/files/receipt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${dummyToken}` },
      body: formData,
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, "PROJECT_NOT_FOUND");
  });

  await t.test("GET /api/files/:id for non-existent file returns 404 FILE_NOT_FOUND", async () => {
    const nonExistentFileId = randomUUID();
    const res = await fetch(`${baseUrl}/api/files/${nonExistentFileId}`, {
      headers: { Authorization: `Bearer ${dummyToken}` },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, "FILE_NOT_FOUND");
  });

  await t.test("DELETE /api/files/:id for non-existent file returns 404 FILE_NOT_FOUND", async () => {
    const nonExistentFileId = randomUUID();
    const res = await fetch(`${baseUrl}/api/files/${nonExistentFileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${dummyToken}` },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, "FILE_NOT_FOUND");
  });
});
