import { useState } from "react";
import { getDownloadUrl } from "../../services/deliverableService";

export default function DeliverableList({ files }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  async function download(file) {
    setBusyId(file.id); setError("");
    try {
      const url = await getDownloadUrl(file.id);
      // The authenticated metadata endpoint supplies a fresh authorized URL.
      window.location.assign(url);
    } catch (err) { setError(err.message); }
    finally { setBusyId(null); }
  }
  return (
    <section className="deliverable-list" aria-label="Submitted work">
      <h2>Submitted work</h2>
      {!files.length && <p>No deliverables submitted yet.</p>}
      {files.map((file) => (
        <article key={file.id} className="deliverable-file">
          <h3>{file.originalFilename}</h3>
          <p>{file.mimeType} · {(file.fileSize / 1024 / 1024).toFixed(2)} MB</p>
          <p>Submitted {new Date(file.createdAt).toLocaleString()}</p>
          <p>{file.status ? `Status: ${file.status}` : "File received. Approval status is not provided."}</p>
          <button type="button" className="btn btn--ghost" disabled={busyId !== null} onClick={() => download(file)}>
            {busyId === file.id ? "Preparing download…" : "Download"}
          </button>
        </article>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
