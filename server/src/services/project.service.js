import { eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { projects } from "../db/schema.js";

export class ProjectError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function createProject({
  title,
  description,
  clientId,
  freelancerId = null,
  amount = 0,
}) {
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new ProjectError("Project title is required.", 400, "VALIDATION_ERROR");
  }

  const [project] = await db
    .insert(projects)
    .values({
      title: title.trim(),
      description: description ? description.trim() : null,
      clientId,
      freelancerId,
      amount: Number(amount) || 0,
      status: "ACTIVE",
    })
    .returning();

  return project;
}

export async function getProjectById(projectId) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return project || null;
}

export async function listUserProjects(userId, userRole) {
  if (userRole === "ADMIN") {
    return db.select().from(projects);
  }

  return db
    .select()
    .from(projects)
    .where(or(eq(projects.clientId, userId), eq(projects.freelancerId, userId)));
}

/**
 * Enforces project authorization and category permissions to prevent IDOR and privilege escalation.
 */
export async function verifyProjectAccess(projectId, userId, userRole, category = null) {
  const project = await getProjectById(projectId);

  if (!project) {
    throw new ProjectError("Project not found.", 404, "PROJECT_NOT_FOUND");
  }

  const isAdmin = userRole === "ADMIN";
  const isClient = project.clientId === userId;
  const isFreelancer = project.freelancerId === userId;

  if (!isAdmin && !isClient && !isFreelancer) {
    throw new ProjectError("You do not have access to this project.", 403, "FORBIDDEN");
  }

  // Category specific upload restrictions
  if (category) {
    if (category === "PAYMENT_RECEIPT" && !isClient && !isAdmin) {
      throw new ProjectError(
        "Only the project client or an administrator can upload payment receipts.",
        403,
        "FORBIDDEN"
      );
    }

    if (category === "DELIVERABLE" && !isFreelancer && !isAdmin) {
      throw new ProjectError(
        "Only the assigned freelancer or an administrator can upload deliverables.",
        403,
        "FORBIDDEN"
      );
    }
  }

  return { project, isClient, isFreelancer, isAdmin };
}
