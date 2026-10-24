import test from "node:test";
import assert from "node:assert/strict";

test("missing storage config does not prevent app startup and rejects uploads with 503", async () => {
  const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const previous = keys.map((key) => process.env[key]);
  keys.forEach((key) => { process.env[key] = ""; });
  try {
    await import("../src/app.js");
    const { singleFileUpload } = await import("../src/middleware/upload.middleware.js");
    const { requireFileStorage } = await import("../src/config/cloudinary.js");
    assert.throws(requireFileStorage, { code: "STORAGE_NOT_CONFIGURED", status: 503 });
    let status;
    let body;
    const response = {
      status(value) { status = value; return this; },
      json(value) { body = value; },
    };
    await singleFileUpload({}, response, () => { throw new Error("Upload parsing must not run without storage"); });
    assert.equal(status, 503);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "STORAGE_NOT_CONFIGURED");
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});
