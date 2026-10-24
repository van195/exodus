import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { webhookEvents } from "../db/schema.js";
import { chapaConfig } from "../config/chapa.js";
import { verifyPayment } from "./payment.service.js";

/**
 * Validates HMAC SHA-256 signature using the raw request body.
 */
export function verifyChapaSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !rawBody) return false;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", chapaConfig.webhookSecret)
      .update(rawBody)
      .digest("hex");

    const headerBuf = Buffer.from(String(signatureHeader).trim(), "utf8");
    const expectedBuf = Buffer.from(expectedSignature, "utf8");

    if (headerBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(headerBuf, expectedBuf);
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}

/**
 * Idempotently processes Chapa webhook events.
 */
export async function processWebhook({ rawBody, signature, payload }) {
  // 1. Verify cryptographic signature
  const isSignatureValid = verifyChapaSignature(rawBody, signature);
  if (!isSignatureValid) {
    console.warn("Rejected webhook with invalid signature");
    return {
      isValid: false,
      statusCode: 401,
      error: "INVALID_SIGNATURE",
    };
  }

  // 2. Extract transaction details
  const body = payload || {};
  const txRef = body.tx_ref || body.reference || body.trx_ref;
  const eventType = body.event || "charge.complete";

  // Generate deduplication fingerprint
  const eventId =
    body.id ||
    body.event_id ||
    crypto.createHash("sha256").update(rawBody).digest("hex");

  // 3. Deduplicate: Ignore if already processed
  const [existingEvent] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.eventId, String(eventId)))
    .limit(1);

  if (existingEvent) {
    return {
      isValid: true,
      statusCode: 200,
      message: "Duplicate webhook event acknowledged.",
      duplicate: true,
    };
  }

  // Record incoming event
  await db.insert(webhookEvents).values({
    eventId: String(eventId),
    eventType,
    txRef: txRef || null,
    status: "PROCESSED",
    payload: typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"),
  });

  // 4. Re-query Chapa server-to-server for authoritative status
  if (txRef) {
    try {
      await verifyPayment({ txRef });
    } catch (err) {
      console.error(`Failed to reconcile payment ${txRef} during webhook:`, err.message);
    }
  }

  return {
    isValid: true,
    statusCode: 200,
    message: "Webhook processed successfully.",
    duplicate: false,
  };
}
