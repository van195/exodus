import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { authConfig } from "../src/config/auth.js";
import { chapaConfig } from "../src/config/chapa.js";
import { verifyChapaSignature } from "../src/services/webhook.service.js";
import app from "../src/app.js";

function makeTestToken(userId, role = "CLIENT") {
  return jwt.sign(
    { role },
    authConfig.jwtSecret,
    { algorithm: "HS256", subject: userId, expiresIn: "1h" }
  );
}

test("Chapa Webhook Signature Verification Unit Tests", async (t) => {
  const secret = chapaConfig.webhookSecret;
  const rawPayload = Buffer.from(JSON.stringify({ event: "charge.complete", tx_ref: "TP-TX-12345" }));

  await t.test("validates genuine HMAC SHA-256 signature", () => {
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(rawPayload)
      .digest("hex");

    const isValid = verifyChapaSignature(rawPayload, validSignature);
    assert.equal(isValid, true);
  });

  await t.test("rejects tampered webhook signature", () => {
    const invalidSignature = "tampered_signature_hex_1234567890abcdef";
    const isValid = verifyChapaSignature(rawPayload, invalidSignature);
    assert.equal(isValid, false);
  });

  await t.test("rejects missing signature or raw body", () => {
    assert.equal(verifyChapaSignature(rawPayload, null), false);
    assert.equal(verifyChapaSignature(null, "some-sig"), false);
  });
});

test("Chapa Payments & Escrow API Integration Security Tests", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const clientToken = makeTestToken(randomUUID(), "CLIENT");
  const strangerToken = makeTestToken(randomUUID(), "CLIENT");

  await t.test("POST /api/payments/initialize without token returns 401 UNAUTHENTICATED", async () => {
    const res = await fetch(`${baseUrl}/api/payments/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: randomUUID() }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });

  await t.test("POST /api/payments/initialize with missing projectId returns 400", async () => {
    const res = await fetch(`${baseUrl}/api/payments/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "MISSING_PROJECT_ID");
  });

  await t.test("POST /api/payments/initialize with non-existent project returns 404", async () => {
    const res = await fetch(`${baseUrl}/api/payments/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({ projectId: randomUUID() }),
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, "PROJECT_NOT_FOUND");
  });

  await t.test("GET /api/payments/verify/:txRef without token returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/payments/verify/TP-TX-random`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });

  await t.test("POST /api/payments/webhook with invalid signature returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-chapa-signature": "invalid-signature",
      },
      body: JSON.stringify({ event: "charge.complete", tx_ref: "TP-TX-999" }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "INVALID_SIGNATURE");
  });

  await t.test("POST /api/payouts/profile without token returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/payouts/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankCode: "856", accountNumber: "123", accountName: "Test" }),
    });

    assert.equal(res.status, 401);
  });

  await t.test("POST /api/payouts/project/:id without token returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/payouts/project/${randomUUID()}`, {
      method: "POST",
    });

    assert.equal(res.status, 401);
  });
});
