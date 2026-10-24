import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { projectActivities, projects } from "../db/schema.js";
import { verifyProjectAccess } from "./project.service.js";

export class LifecycleError extends Error {
  constructor(message, status = 400, code = "LIFECYCLE_ERROR", details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Client or Freelancer accepts project agreement and terms.
 * Transitions: AGREEMENT_PENDING (or DRAFT) -> AWAITING_PAYMENT
 */
export async function acceptAgreement({ projectId, userId, userRole }) {
  const { project } = await verifyProjectAccess(projectId, userId, userRole);

  const validStatuses = ["DRAFT", "AGREEMENT_PENDING"];
  if (!validStatuses.includes(project.status)) {
    throw new LifecycleError(
      `Cannot accept agreement. Project is currently in status: ${project.status}`,
      400,
      "INVALID_STATUS"
    );
  }

  const [updated] = await db
    .update(projects)
    .set({
      status: "AWAITING_PAYMENT",
      agreedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  await db.insert(projectActivities).values({
    projectId,
    userId,
    action: "AGREEMENT_ACCEPTED",
    fromStatus: project.status,
    toStatus: "AWAITING_PAYMENT",
    notes: "Agreement terms accepted. Project is ready for escrow funding.",
  });

  return updated;
}

/**
 * Freelancer submits deliverables for client review.
 * Transitions: FUNDED / IN_PROGRESS / REVISION_REQUESTED -> CLIENT_REVIEW
 */
export async function submitDeliverable({ projectId, userId, userRole, notes = "" }) {
  const { project, isFreelancer, isAdmin } = await verifyProjectAccess(projectId, userId, userRole);

  if (!isFreelancer && !isAdmin) {
    throw new LifecycleError(
      "Only the assigned freelancer or an administrator can submit deliverables.",
      403,
      "FORBIDDEN"
    );
  }

  const validStatuses = ["FUNDED", "ACTIVE", "IN_PROGRESS", "REVISION_REQUESTED"];
  if (!validStatuses.includes(project.status)) {
    throw new LifecycleError(
      `Cannot submit deliverable while project is in status: ${project.status}`,
      400,
      "INVALID_STATUS"
    );
  }

  const [updated] = await db
    .update(projects)
    .set({
      status: "CLIENT_REVIEW",
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  await db.insert(projectActivities).values({
    projectId,
    userId,
    action: "DELIVERABLE_SUBMITTED",
    fromStatus: project.status,
    toStatus: "CLIENT_REVIEW",
    notes: notes || "Work delivered for client review.",
  });

  return updated;
}

/**
 * Client accepts delivered work and authorizes fund release.
 * Transitions: CLIENT_REVIEW / DELIVERABLE_SUBMITTED -> RELEASE_APPROVED
 */
export async function acceptDeliverable({ projectId, userId, userRole, notes = "" }) {
  const { project, isClient, isAdmin } = await verifyProjectAccess(projectId, userId, userRole);

  if (!isClient && !isAdmin) {
    throw new LifecycleError(
      "Only the project client or an administrator can accept deliverables.",
      403,
      "FORBIDDEN"
    );
  }

  if (project.status !== "CLIENT_REVIEW") {
    throw new LifecycleError(
      `Cannot accept deliverable. Project is not in review (current status: ${project.status}).`,
      400,
      "INVALID_STATUS"
    );
  }

  const [updated] = await db
    .update(projects)
    .set({
      status: "RELEASE_APPROVED",
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  await db.insert(projectActivities).values({
    projectId,
    userId,
    action: "DELIVERABLE_ACCEPTED",
    fromStatus: "CLIENT_REVIEW",
    toStatus: "RELEASE_APPROVED",
    notes: notes || "Deliverables approved by client. Ready for freelancer payout.",
  });

  return updated;
}

/**
 * Client requests revisions on submitted work.
 * Transitions: CLIENT_REVIEW -> REVISION_REQUESTED
 */
export async function requestRevision({ projectId, userId, userRole, reason }) {
  const { project, isClient, isAdmin } = await verifyProjectAccess(projectId, userId, userRole);

  if (!isClient && !isAdmin) {
    throw new LifecycleError(
      "Only the project client or an administrator can request revisions.",
      403,
      "FORBIDDEN"
    );
  }

  if (project.status !== "CLIENT_REVIEW") {
    throw new LifecycleError(
      `Cannot request revision. Project is not in review (current status: ${project.status}).`,
      400,
      "INVALID_STATUS"
    );
  }

  if (!reason || !reason.trim()) {
    throw new LifecycleError("A reason is required when requesting revisions.", 400, "MISSING_REASON");
  }

  if (project.revisionCount >= project.maxRevisions) {
    throw new LifecycleError(
      `Maximum revision limit (${project.maxRevisions}) reached. You may approve the release or raise a dispute.`,
      400,
      "MAX_REVISIONS_EXCEEDED"
    );
  }

  const nextCount = project.revisionCount + 1;

  const [updated] = await db
    .update(projects)
    .set({
      status: "REVISION_REQUESTED",
      revisionCount: nextCount,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  await db.insert(projectActivities).values({
    projectId,
    userId,
    action: "REVISION_REQUESTED",
    fromStatus: "CLIENT_REVIEW",
    toStatus: "REVISION_REQUESTED",
    notes: `Revision #${nextCount} requested: ${reason.trim()}`,
  });

  return updated;
}

/**
 * Client or Freelancer opens a dispute.
 * Transitions any active project -> DISPUTED
 */
export async function openDispute({ projectId, userId, userRole, reason }) {
  const { project } = await verifyProjectAccess(projectId, userId, userRole);

  const lockedStatuses = ["PAID_OUT", "COMPLETED", "CANCELLED", "DISPUTED"];
  if (lockedStatuses.includes(project.status)) {
    throw new LifecycleError(
      `Cannot open dispute. Project is in final state: ${project.status}`,
      400,
      "INVALID_STATUS"
    );
  }

  if (!reason || !reason.trim()) {
    throw new LifecycleError("A reason is required to open a dispute.", 400, "MISSING_REASON");
  }

  const [updated] = await db
    .update(projects)
    .set({
      status: "DISPUTED",
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  await db.insert(projectActivities).values({
    projectId,
    userId,
    action: "DISPUTE_OPENED",
    fromStatus: project.status,
    toStatus: "DISPUTED",
    notes: `Dispute opened: ${reason.trim()}`,
  });

  return updated;
}

/**
 * Retrieve project audit activity timeline.
 */
export async function getProjectActivities(projectId, userId, userRole) {
  await verifyProjectAccess(projectId, userId, userRole);

  return db
    .select()
    .from(projectActivities)
    .where(eq(projectActivities.projectId, projectId))
    .orderBy(projectActivities.createdAt);
}
