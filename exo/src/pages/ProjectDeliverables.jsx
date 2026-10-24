import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, clearSession, getToken } from "../services/api";
import { canSubmitDeliverable, listDeliverables } from "../services/deliverableService";
import DeliverableUpload from "../components/deliverables/DeliverableUpload";
import DeliverableList from "../components/deliverables/DeliverableList";
import DeliverableReview from "../components/deliverables/DeliverableReview";
import "../styles/dashboard.css";
import "../styles/deliverables.css";

export default function ProjectDeliverables() {
  const { projectId } = useParams();
  return <ProjectView key={projectId || "list"} projectId={projectId} />;
}

function ProjectView({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);

  async function load(signal) {
    setLoading(true); setError("");
    try {
      setData(await fetchProjectData(projectId, signal));
      setUncertain(false);
    } catch (err) {
      if (!signal?.aborted) { setError(err.message); setUncertain(true); }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function initialLoad() {
      try {
        const result = await fetchProjectData(projectId, controller.signal);
        if (!controller.signal.aborted) setData(result);
      } catch (err) {
        if (!controller.signal.aborted) { setError(err.message); setUncertain(true); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    initialLoad();
    return () => controller.abort();
  }, [projectId]);

  async function uploaded(file) {
    setData((previous) => ({ ...previous, files: [...previous.files, file] }));
    setMessage("Work uploaded successfully. Project approval and payment remain separate.");
    await load();
  }

  const project = data?.project;
  const canUpload = !loading && !uncertain && getToken() && project
    && canSubmitDeliverable(data.user, project, data.files);

  return (
    <div className="dash deliverables-shell">
      <main className="deliverables-main">
        <nav className="deliverables-nav" aria-label="Project navigation">
          <Link to="/projects">My projects</Link>
          <Link to="/dashboard">Demo dashboard</Link>
          <Link to="/login" onClick={clearSession}>Log out</Link>
        </nav>
        <header><h1>{projectId ? project?.title || "Project deliverables" : "My projects"}</h1>
          <p>Manage completed work and download project deliverables.</p>
        </header>
        {loading && <p role="status">Loading project details…</p>}
        {message && <p role="status">{message}</p>}
        {error && <div role="alert"><p>{error}</p>
          {!getToken() && <Link to="/login">Log in</Link>}
        </div>}
        {!loading && <button type="button" className="btn btn--ghost" onClick={() => load()}>Refresh</button>}
        {!loading && !error && !projectId && data && (
          <section className="grid" aria-label="Your projects">
            {data.projects.length === 0 && <p>No projects are assigned to your account yet.</p>}
            {data.projects.map((item) => (
              <article className="card" key={item.id}>
                <h2>{item.title}</h2><p>Project status: {item.status}</p>
                <Link className="btn btn--grad" to={`/projects/${item.id}`}>View deliverables</Link>
              </article>
            ))}
          </section>
        )}
        {project && !loading && !error && (
          <>
            <section className="deliverable-summary">
              <h2>Project details</h2><p>{project.description}</p>
              <p>Project status: <strong>{project.status}</strong></p>
            </section>
            {canUpload && <DeliverableUpload projectId={project.id} onUploaded={uploaded}
              onUncertain={(text) => { setUncertain(true); setError(text); }} />}
            {!canUpload && data.user.role === "FREELANCER" && project.freelancerId === data.user.id && (
              <p>{data.files.length
                ? "Work has been submitted. Further submissions require a revision workflow."
                : "Submissions are unavailable for the current project status."}</p>
            )}
            <DeliverableList files={data.files} />
            {data.user.role === "CLIENT" && project.clientId === data.user.id && (
              <DeliverableReview project={project} files={data.files} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

async function fetchProjectData(projectId, signal) {
  if (!getToken()) throw new Error("Please log in to access your projects.");
  const { user } = await apiRequest("/auth/me", { signal });
  if (projectId) {
    const [{ project }, files] = await Promise.all([
      apiRequest(`/projects/${encodeURIComponent(projectId)}`, { signal }),
      listDeliverables(projectId, signal),
    ]);
    return { user, project, files };
  }
  const { projects } = await apiRequest("/projects", { signal });
  return { user, projects };
}
