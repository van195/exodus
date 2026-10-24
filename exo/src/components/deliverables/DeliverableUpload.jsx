import { useEffect, useRef, useState } from "react";
import { ACCEPTED_FILES, uploadDeliverable, validateDeliverable } from "../../services/deliverableService";

export default function DeliverableUpload({ projectId, onUploaded, onUncertain }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const controller = useRef(null);
  const inFlight = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const validation = validateDeliverable(file);
    setError(validation);
    if (validation) return;
    inFlight.current = true;
    setBusy(true);
    controller.current = new AbortController();
    try {
      const uploaded = await uploadDeliverable(projectId, file, setProgress, controller.current.signal);
      await onUploaded(uploaded);
    } catch (err) {
      if (!controller.current.signal.aborted) {
        setError(err.message);
        onUncertain(err.message);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form className="deliverable-upload" onSubmit={submit} aria-busy={busy}>
      <h2>Submit completed work</h2>
      <label htmlFor="deliverable-file">Choose your deliverable</label>
      <input id="deliverable-file" type="file" accept={ACCEPTED_FILES} disabled={busy}
        aria-describedby="deliverable-help" onChange={(event) => {
          const next = event.target.files?.[0] || null;
          setFile(next); setError(next ? validateDeliverable(next) : "");
        }} />
      <p id="deliverable-help">ZIP, PDF, DOCX, PNG, or JPEG. Maximum 10 MB.</p>
      {file && <p>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
      {busy && <div role="status">
        {progress === null ? "Starting upload…" : progress === 100 ? "Saving your submission…" : `Uploading: ${progress}%`}
        <progress max="100" value={progress ?? undefined} aria-label="Upload progress" />
      </div>}
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="btn btn--grad" disabled={busy || !file || Boolean(validateDeliverable(file))}>
        {busy ? "Submitting…" : "Submit Completed Work"}
      </button>
    </form>
  );
}
