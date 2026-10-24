import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import app from "../src/app.js";
import { client } from "../src/db/index.js";

test("Auth API Endpoints", async (t) => {
  const email = `test-user-${randomUUID()}@example.invalid`;
  const password = "Valid-Passw0rd123!";
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function post(path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }

  async function get(path, token) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return { status: res.status, body: await res.json() };
  }

  t.after(async () => {
    try {
      await client`DELETE FROM users WHERE email = ${email}`;
    } catch {
      // Ignore cleanup error if record wasn't created
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await client.end({ timeout: 2 });
    }
  });

  await t.test("GET /health returns 200 ok", async () => {
    const res = await get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
  });

  await t.test("GET /api/auth/me without token returns 401 UNAUTHENTICATED", async () => {
    const res = await get("/api/auth/me");
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "UNAUTHENTICATED");
  });

  let authToken = null;
  let createdUserId = null;

  await t.test("POST /api/auth/register creates user and returns token", async () => {
    const res = await post("/api/auth/register", {
      fullName: "Test User",
      email,
      password,
      confirmPassword: password,
      role: "CLIENT",
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, email);
    assert.equal(res.body.data.user.fullName, "Test User");
    assert.equal(typeof res.body.data.token, "string");
    assert.equal("passwordHash" in res.body.data.user, false);
    createdUserId = res.body.data.user.id;
  });

  await t.test("POST /api/auth/register rejects duplicate email with 409", async () => {
    const res = await post("/api/auth/register", {
      fullName: "Duplicate User",
      email,
      password,
      confirmPassword: password,
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "EMAIL_ALREADY_REGISTERED");
  });

  await t.test("POST /api/auth/login succeeds with valid credentials", async () => {
    const res = await post("/api/auth/login", {
      email: ` ${email.toUpperCase()} `,
      password,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.data.token, "string");
    assert.equal(res.body.data.user.email, email);
    assert.equal("passwordHash" in res.body.data.user, false);
    authToken = res.body.data.token;
  });

  await t.test("POST /api/auth/login rejects invalid credentials with 401", async () => {
    const res = await post("/api/auth/login", {
      email,
      password: "WrongPassword-123!",
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "INVALID_CREDENTIALS");
  });

  await t.test("POST /api/auth/login rejects invalid payload with 400", async () => {
    const res = await post("/api/auth/login", { email: "not-an-email", password: "" });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  await t.test("GET /api/auth/me with valid Bearer token returns user profile", async () => {
    const res = await get("/api/auth/me", authToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.id, createdUserId);
    assert.equal(res.body.data.user.email, email);
  });
});
