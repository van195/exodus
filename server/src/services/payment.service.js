import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/index.js";
import {
  payments,
  projectActivities,
  projects,
  users,
} from "../db/schema.js";
import { chapaConfig } from "../config/chapa.js";
import {
  initializeChapaPayment,
  verifyChapaTransaction,
} from "./chapa.service.js";
import { verifyProjectAccess } from "./project.service.js";

export class PaymentError extends Error {
  constructor(message, status = 400, code = "PAYMENT_ERROR", details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Initialize escrow payment with Chapa.
 * Amount and currency are read strictly from trusted database records.
 */
export async function initializePayment({
  projectId,
  clientId,
  userEmail,
  userFullName,
}) {
  // 1. Authorize: Only the project client or an admin can initialize funding
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
    .then((r) => r[0]);

  if (!project) {
    throw new PaymentError("Project not found.", 404, "PROJECT_NOT_FOUND");
  }

  if (project.clientId !== clientId) {
    throw new PaymentError(
      "Only the designated client of this project can initiate payment.",
      403,
      "FORBIDDEN"
    );
  }

  // 2. Validate project state
  const ineligibleStatuses = [
    "FUNDED",
    "IN_PROGRESS",
    "DELIVERABLE_SUBMITTED",
    "CLIENT_REVIEW",
    "RELEASE_APPROVED",
    "PAYOUT_PENDING",
    "PAID_OUT",
    "COMPLETED",
    "DISPUTED",
    "CANCELLED",
  ];

  if (ineligibleStatuses.includes(project.status)) {
    throw new PaymentError(
      `Project is not eligible for payment. Current status is ${project.status}.`,
      400,
      "INVALID_PROJECT_STATUS"
    );
  }

  const numericAmount = Number(project.amount);
  if (!numericAmount || numericAmount <= 0) {
    throw new PaymentError(
      "Project amount must be a positive number before initiating payment.",
      400,
      "INVALID_AMOUNT"
    );
  }

  // 3. Idempotency: Check if an active pending payment exists created in the last 15 minutes
  const [existingPending] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.projectId, projectId), eq(payments.status, "PENDING")))
    .orderBy(desc(payments.createdAt))
    .limit(1);

  if (existingPending && existingPending.checkoutUrl) {
    const ageMs = Date.now() - new Date(existingPending.createdAt).getTime();
    if (ageMs < 15 * 60 * 1000) {
      return {
        paymentId: existingPending.id,
        txRef: existingPending.txRef,
        amount: existingPending.amount,
        currency: existingPending.currency,
        checkoutUrl: existingPending.checkoutUrl,
        isReused: true,
      };
    }
  }

  // 4. Generate unique server transaction reference
  const txRef = `TP-TX-${projectId.slice(0, 8)}-${Date.now()}-${randomUUID().slice(0, 6)}`;

  // 5. Save pending record in DB before calling external provider
  const [createdPayment] = await db
    .insert(payments)
    .values({
      projectId,
      payerId: clientId,
      txRef,
      amount: String(numericAmount.toFixed(2)),
      currency: project.currency || "ETB",
      status: "PENDING",
    })
    .returning();

  // Update project status to PAYMENT_PENDING
  await db
    .update(projects)
    .set({ status: "PAYMENT_PENDING", updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  await db.insert(projectActivities).values({
    projectId,
    userId: clientId,
    action: "PAYMENT_INITIALIZED",
    fromStatus: project.status,
    toStatus: "PAYMENT_PENDING",
    notes: `Chapa payment initiated with reference ${txRef} for ${project.currency} ${numericAmount.toFixed(2)}`,
  });

  // 6. Contact Chapa initialization API
  const nameParts = (userFullName || "Client User").trim().split(/\s+/);
  const firstName = nameParts[0] || "Client";
  const lastName = nameParts.slice(1).join(" ") || "User";

  let chapaInit;
  try {
    chapaInit = await initializeChapaPayment({
      amount: numericAmount.toFixed(2),
      currency: project.currency || "ETB",
      email: userEmail,
      firstName,
      lastName,
      txRef,
      callbackUrl: `${chapaConfig.serverUrl}/api/payments/webhook`,
      returnUrl: `${chapaConfig.clientUrl}/projects/${projectId}?payment=verification&tx_ref=${txRef}`,
      title: "Trust Payment Escrow",
      description: `Funding escrow for project: ${project.title.slice(0, 50)}`,
    });
  } catch (err) {
    // Mark payment as failed if provider call fails
    await db
      .update(payments)
      .set({ status: "FAILED", updatedAt: new Date() })
      .where(eq(payments.id, createdPayment.id));

    await db
      .update(projects)
      .set({ status: "AWAITING_PAYMENT", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    throw err;
  }

  // 7. Update payment record with checkout URL
  await db
    .update(payments)
    .set({
      checkoutUrl: chapaInit.checkoutUrl,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, createdPayment.id));

  return {
    paymentId: createdPayment.id,
    txRef,
    amount: createdPayment.amount,
    currency: createdPayment.currency,
    checkoutUrl: chapaInit.checkoutUrl,
    isReused: false,
  };
}

/**
 * Server-to-server payment verification against Chapa ground truth.
 */
export async function verifyPayment({
  txRef,
  paymentId,
  requestingUserId = null,
  requestingUserRole = null,
}) {
  let payment;

  if (paymentId) {
    payment = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1)
      .then((r) => r[0]);
  } else if (txRef) {
    payment = await db
      .select()
      .from(payments)
      .where(eq(payments.txRef, txRef))
      .limit(1)
      .then((r) => r[0]);
  }

  if (!payment) {
    throw new PaymentError("Payment transaction not found.", 404, "PAYMENT_NOT_FOUND");
  }

  // If requesting user is provided, check project access
  if (requestingUserId) {
    await verifyProjectAccess(payment.projectId, requestingUserId, requestingUserRole);
  }

  // If already successful, return idempotent response
  if (payment.status === "SUCCESSFUL") {
    return {
      payment,
      isVerified: true,
      message: "Payment is already verified and successful.",
    };
  }

  // Contact Chapa official verification endpoint
  const verified = await verifyChapaTransaction(payment.txRef);

  const amountMatches = Number(verified.amount) === Number(payment.amount);
  const currencyMatches = (verified.currency || "").toUpperCase() === (payment.currency || "").toUpperCase();

  if (verified.isSuccess && amountMatches && currencyMatches) {
    // Concurrency-safe transition: only update if still PENDING
    const [updatedPayment] = await db
      .update(payments)
      .set({
        status: "SUCCESSFUL",
        verifiedAt: new Date(),
        chapaReference: verified.chapaReference || null,
        paymentMethod: verified.paymentMethod || null,
        rawVerificationData: JSON.stringify(verified.raw),
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "PENDING")))
      .returning();

    // If already updated concurrently by webhook, reload and return
    if (!updatedPayment) {
      const refreshed = await db
        .select()
        .from(payments)
        .where(eq(payments.id, payment.id))
        .limit(1)
        .then((r) => r[0]);
      return { payment: refreshed, isVerified: refreshed?.status === "SUCCESSFUL" };
    }

    // Move project to FUNDED
    await db
      .update(projects)
      .set({
        status: "FUNDED",
        fundedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, payment.projectId));

    await db.insert(projectActivities).values({
      projectId: payment.projectId,
      userId: payment.payerId,
      action: "PAYMENT_VERIFIED",
      fromStatus: "PAYMENT_PENDING",
      toStatus: "FUNDED",
      notes: `Payment verified successfully via Chapa. Reference: ${payment.txRef}. Escrow is now funded.`,
    });

    return {
      payment: updatedPayment,
      isVerified: true,
      message: "Payment verified successfully. Project escrow is funded.",
    };
  }

  // If failed on Chapa
  if (!verified.isSuccess && verified.status !== "pending") {
    await db
      .update(payments)
      .set({
        status: "FAILED",
        rawVerificationData: JSON.stringify(verified.raw),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    await db
      .update(projects)
      .set({ status: "AWAITING_PAYMENT", updatedAt: new Date() })
      .where(eq(projects.id, payment.projectId));

    await db.insert(projectActivities).values({
      projectId: payment.projectId,
      userId: payment.payerId,
      action: "PAYMENT_FAILED",
      fromStatus: "PAYMENT_PENDING",
      toStatus: "AWAITING_PAYMENT",
      notes: `Chapa payment verification reported ${verified.status}`,
    });

    return {
      payment: { ...payment, status: "FAILED" },
      isVerified: false,
      message: `Payment failed or could not be verified by provider (${verified.status}).`,
    };
  }

  return {
    payment,
    isVerified: false,
    message: "Payment is still pending with provider.",
  };
}

/**
 * List all payments for a project.
 */
export async function getProjectPayments(projectId, userId, userRole) {
  await verifyProjectAccess(projectId, userId, userRole);
  return db
    .select()
    .from(payments)
    .where(eq(payments.projectId, projectId))
    .orderBy(desc(payments.createdAt));
}
