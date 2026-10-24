import test from "node:test";
import assert from "node:assert/strict";
import { validateLogin, validateRegistration } from "../src/validators/auth.validator.js";

const validBody = {
  fullName: " Abebe Kebede ",
  email: " ABEBE@example.com ",
  password: "A-Strong-Password123!",
  confirmPassword: "A-Strong-Password123!",
};

test("normalizes registration data and defaults role to CLIENT", () => {
  const { errors, value } = validateRegistration(validBody);
  assert.deepEqual(errors, {});
  assert.equal(value.fullName, "Abebe Kebede");
  assert.equal(value.email, "abebe@example.com");
  assert.equal(value.role, "CLIENT");
  assert.equal(value.phone, null);
  assert.equal("confirmPassword" in value, false);
});

test("accepts FREELANCER and optional phone", () => {
  const { errors, value } = validateRegistration({
    ...validBody,
    phone: "+251911000000",
    role: "freelancer",
  });
  assert.deepEqual(errors, {});
  assert.equal(value.role, "FREELANCER");
  assert.equal(value.phone, "+251911000000");
});

test("rejects ADMIN and unsupported roles", () => {
  for (const role of ["ADMIN", "OWNER", 42]) {
    const { errors } = validateRegistration({ ...validBody, role });
    assert.ok(errors.role);
  }
});

test("requires matching confirmation password", () => {
  const missing = validateRegistration({ ...validBody, confirmPassword: undefined });
  const mismatch = validateRegistration({ ...validBody, confirmPassword: "different" });
  assert.ok(missing.errors.confirmPassword);
  assert.ok(mismatch.errors.confirmPassword);
});

test("rejects malformed email, weak-length password, and invalid phone", () => {
  const { errors } = validateRegistration({
    ...validBody,
    email: "not-an-email",
    password: "short",
    confirmPassword: "short",
    phone: 123,
  });
  assert.ok(errors.email);
  assert.ok(errors.password);
  assert.ok(errors.phone);
});

test("does not allow callers to choose ADMIN at registration", () => {
  const { errors } = validateRegistration({ ...validBody, role: "ADMIN" });
  assert.equal(errors.role, "Role must be CLIENT or FREELANCER.");
});

test("normalizes login email and requires credentials", () => {
  const valid = validateLogin({ email: " ABEBE@example.com ", password: "anything" });
  assert.deepEqual(valid.errors, {});
  assert.deepEqual(valid.value, { email: "abebe@example.com", password: "anything" });

  const invalid = validateLogin({ email: "bad", password: "" });
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.password);
});
