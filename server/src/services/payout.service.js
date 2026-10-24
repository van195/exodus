import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/index.js";
import {
  payoutProfiles,
  payouts,
  projectActivities,
  projects,
} from "../db/schema.js";
import {
  initiateChapaTransfer,
  verifyChapaTransfer,
} from "./chapa.service.js";
import { verifyProjectAccess } from "./project.service.js";

export class PayoutError extends Error {
  constructor(message, status = 400, code = "PAYOUT_ERROR", details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Configure or update a freelancer's payout bank account details.
 */
export async function savePayoutProfile({
  freelancerId,
  bankCode,
  bankName,
  accountNumber,
  accountName,
}) {
  if (!bankCode || !accountNumber || !accountName) {
    throw new PayoutError("Bank code, account number, and account name are required.", 400, "VALIDATION_ERROR");
  }

  const [existing] = await db
    .select()
    .from(payoutProfiles)
    .where(eq(payoutProfiles.freelancerId, freelancerId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(payoutProfiles)
      .set({
        bankCode,
        bankName: bankName || existing.bankName,
        accountNumber,
        accountName,
        updatedAt: new Date(),
      })
      .where(eq(payoutProfiles.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(payoutProfiles)
    .values({
      freelancerId,
      bankCode,
      bankName: bankName || "Bank",
      accountNumber,
      accountName,
      isVerified: true,
    })
    .returning();

  return created;
}

/**
 * Retrieve a freelancer's payout profile.
 */
export async function getPayoutProfile(freelancerId) {
  const [profile] = await db
    .select()
    .from(payoutProfiles)
    .where(eq(payoutProfiles.freelancerId, freelancerId))
    .limit(1);

  return profile || null;
}

/**
 * Initiates an approved escrow payout to the freelancer using Chapa Transfers.
 * Enforces that project must be in RELEASE_APPROVED status.
 */
export async function initiatePayout({ projectId, callerId, callerRole }) {
  const { project, isClient, isFreelancer, isAdmin } = await verifyProjectAccess(
    projectId,
    callerId,
    callerRole
  );

  if (!isClient && !isFreelancer && !isAdmin) {
    throw new PayoutError("You are not authorized to trigger payout for this project.", 403, "FORBIDDEN");
  }

  if (project.status !== "RELEASE_APPROVED") {
    throw new PayoutError(
      `Cannot initiate payout. Project must be in RELEASE_APPROVED state (current status: ${project.status}).`,
      400,
      "INVALID_STATUS"
    );
  }

  if (!project.freelancerId) {
    throw new PayoutError("No freelancer is assigned to this project.", 400, "NO_FREELANCER_ASSIGNED");
  }

  // Retrieve freelancer's payout profile
  const profile = await getPayoutProfile(project.freelancerId);
  if (!profile) {
    throw new PayoutError(
      "The freelancer has not configured their bank payout details yet. Payout is suspended until bank details are added.",
      400,
      "MISSING_PAYOUT_PROFILE"
    );
  }

  // Idempotency: generate unique payout reference
  const reference = `TP-PO-${projectId.slice(0, 8)}-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const amount = Number(project.amount);

  // Create immutable pending payout record before contacting provider
  const [createdPayout] = await db
    .insert(payouts)
    .values({
      projectId,
      freelancerId: project.freelancerId,
      reference,
      amount: String(amount.toFixed(2)),
      currency: project.currency || "ETB",
      bankCode: profile.bankCode,
      accountNumber: profile.accountNumber,
      accountName: profile.accountName,
      status: "PENDING",
    })
    .returning();

  // Transition project to PAYOUT_PENDING
  await db
    .update(projects)
    .set({ status: "PAYOUT_PENDING", updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  await db.insert(projectActivities).values({
    projectId,
    userId: callerId,
    action: "PAYOUT_INITIATED",
    fromStatus: "RELEASE_APPROVED",
    toStatus: "PAYOUT_PENDING",
    notes: `Transfer request initiated to ${profile.bankName} (${profile.accountNumber}) for ${project.currency} ${amount.toFixed(2)}`,
  });

  // Call Chapa Transfers API
  let chapaTransfer;
  try {
    chapaTransfer = await initiateChapaTransfer({
      amount: amount.toFixed(2),
      currency: project.currency || "ETB",
      accountName: profile.accountName,
      accountNumber: profile.accountNumber,
      bankCode: profile.bankCode,
      reference,
    });
  } catch (err) {
    // If provider API fails, mark payout as failed and revert project so it can be retried
    await db
      .update(payouts)
      .set({
        status: "FAILED",
        failureReason: err.message,
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, createdPayout.id));

    await db
      .update(projects)
      .set({ status: "RELEASE_APPROVED", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    await db.insert(projectActivities).values({
      projectId,
      userId: callerId,
      action: "PAYOUT_FAILED",
      fromStatus: "PAYOUT_PENDING",
      toStatus: "RELEASE_APPROVED",
      notes: `Transfer request failed: ${err.message}`,
    });

    throw err;
  }

  // Update payout record with response details
  const isImmediateSuccess = chapaTransfer.isSuccess;
  const finalPayoutStatus = isImmediateSuccess ? "SUCCESSFUL" : "PENDING";

  const [updatedPayout] = await db
    .update(payouts)
    .set({
      chapaTransferId: chapaTransfer.transferId ? String(chapaTransfer.transferId) : null,
      status: finalPayoutStatus,
      rawResponse: JSON.stringify(chapaTransfer.raw),
      processedAt: isImmediateSuccess ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(payouts.id, createdPayout.id))
    .returning();

  if (isImmediateSuccess) {
    await db
      .update(projects)
      .set({
        status: "PAID_OUT",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    await db.insert(projectActivities).values({
      projectId,
      userId: callerId,
      action: "PAYOUT_COMPLETED",
      fromStatus: "PAYOUT_PENDING",
      toStatus: "PAID_OUT",
      notes: `Payout transferred successfully to freelancer. Ref: ${reference}`,
    });
  }

  return {
    payout: updatedPayout,
    projectStatus: isImmediateSuccess ? "PAID_OUT" : "PAYOUT_PENDING",
    message: isImmediateSuccess
      ? "Payout completed successfully."
      : "Payout request submitted to Chapa and is processing.",
  };
}

/**
 * Verify payout status by reference.
 */
export async function verifyPayout({ reference, callerId, callerRole }) {
  const [payout] = await db
    .select()
    .from(payouts)
    .where(eq(payouts.reference, reference))
    .limit(1);

  if (!payout) {
    throw new PayoutError("Payout record not found.", 404, "PAYOUT_NOT_FOUND");
  }

  if (callerId) {
    await verifyProjectAccess(payout.projectId, callerId, callerRole);
  }

  if (payout.status === "SUCCESSFUL") {
    return { payout, isVerified: true };
  }

  const result = await verifyChapaTransfer(reference);

  if (result.isSuccess) {
    const [updated] = await db
      .update(payouts)
      .set({
        status: "SUCCESSFUL",
        processedAt: new Date(),
        rawResponse: JSON.stringify(result.raw),
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, payout.id))
      .returning();

    await db
      .update(projects)
      .set({ status: "PAID_OUT", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(projects.id, payout.projectId));

    return { payout: updated, isVerified: true };
  }

  return { payout, isVerified: false, status: result.status };
}
