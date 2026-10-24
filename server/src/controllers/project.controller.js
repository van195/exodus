import {
  createProject,
  getProjectById,
  listUserProjects,
  ProjectError,
} from "../services/project.service.js";

function sendError(res, error) {
  if (error instanceof ProjectError) {
    return res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }

  console.error("Unhandled project controller error:", error);
  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "The request could not be completed." },
  });
}

export async function createNewProject(req, res) {
  try {
    const { title, description, freelancerId, amount } = req.body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Title is required." },
      });
    }

    const project = await createProject({
      title,
      description,
      clientId: req.auth.userId,
      freelancerId: freelancerId || null,
      amount: amount || 0,
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully.",
      data: { project },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getProjects(req, res) {
  try {
    const projectsList = await listUserProjects(req.auth.userId, req.auth.role);
    return res.status(200).json({
      success: true,
      data: { projects: projectsList },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getProject(req, res) {
  try {
    const { projectId } = req.params;
    const project = await getProjectById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: "PROJECT_NOT_FOUND", message: "Project not found." },
      });
    }

    const isMember =
      project.clientId === req.auth.userId ||
      project.freelancerId === req.auth.userId ||
      req.auth.role === "ADMIN";

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You do not have access to this project." },
      });
    }

    return res.status(200).json({
      success: true,
      data: { project },
    });
  } catch (error) {
    return sendError(res, error);
  }
}
