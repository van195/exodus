import { useRef, useState } from "react";
import { getDownloadUrl } from "../../services/deliverableService";

const CHECKS = [
  "I downloaded and inspected the submitted files.",
  "I tested the delivered project against the agreed requirements.",
  "The deliverables include the agreed source code and setup instructions.",
];

export default function DeliverableReview({ project, files }) {
  const [selectedId, setSelectedId] = useState(files[0]?.id || "");
  const [access, setAccess] = useState(null);
  const [checked, setChecked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const selected = files.find((file) => file.id === selectedId);

  async function prepareFile() {
    const currentRequest = ++requestId.current;
    setBusy(true); setError(""); setAccess(null);
    try {
      const url = await getDownloadUrl(selected.id);
      if (currentRequest === requestId.current) setAccess({ fileId: selected.id, url });
    } catch (err) {
      if (currentRequest === requestId.current) setError(err.message);
    } finally {
      if (currentRequest === requestId.current) setBusy(false);
    }
  }

  return (
    <section className="deliverable-review" aria-labelledby="review-title">
      <h2 id="review-title">Review completed work</h2>
      <ol className="delivery-flow">
        <li>Developer submits files</li>
        <li aria-current="step">You inspect and test the work</li>
        <li>You approve and release payment</li>
      </ol>
      <p>Project status: <strong>{project.status}</strong>. Receiving a file does not approve the work or release payment.</p>
      {!files.length ? <p>The assigned developer has not submitted a deliverable yet.</p> : <>
        <label htmlFor="review-file">Select a submitted file</label>
        <select id="review-file" value={selectedId} onChange={(event) => {
          requestId.current += 1;
          setSelectedId(event.target.value); setAccess(null); setError(""); setBusy(false);
        }}>
          {files.map((file) => <option key={file.id} value={file.id}>{file.originalFilename}</option>)}
        </select>
        {selected && <>
          <p>{selected.mimeType} · {(selected.fileSize / 1024 / 1024).toFixed(2)} MB · Submitted {new Date(selected.createdAt).toLocaleString()}</p>
          <button className="btn btn--ghost" type="button" disabled={busy} onClick={prepareFile}>
            {busy ? "Preparing file…" : "Open file for review"}
          </button>
          {access?.fileId === selected.id && <div className="review-preview">
            {["image/jpeg", "image/png"].includes(selected.mimeType) && (
              <img src={access.url} alt={`Submitted work: ${selected.originalFilename}`} referrerPolicy="no-referrer"
                onError={() => setError("The image could not be previewed. Try opening the file or preparing a fresh link.")} />
            )}
            <a className="btn btn--ghost" href={access.url} target="_blank" rel="noopener noreferrer">Open or download {selected.originalFilename}</a>
            <p>{selected.mimeType === "application/zip"
              ? "Download and extract the ZIP, then inspect the source code and follow its setup instructions."
              : "Open the file to inspect its contents. Document viewing depends on your browser or installed applications."}</p>
            <p>This link is temporary. Select “Open file for review” again if it expires.</p>
          </div>}
        </>}
        <fieldset className="review-checklist">
          <legend>Review checklist for this visit</legend>
          {CHECKS.map((text, index) => <label key={text}>
            <input type="checkbox" checked={checked.includes(index)} onChange={(event) => {
              setChecked((previous) => event.target.checked ? [...previous, index] : previous.filter((item) => item !== index));
            }} />
            <span>{text}</span>
          </label>)}
        </fieldset>
        <p role="status">{checked.length} of {CHECKS.length} review checks completed. These checks do not record project approval.</p>
      </>}
      {error && <p role="alert">{error}</p>}
      <div className="review-decision">
        <button type="button" className="btn btn--grad" disabled aria-describedby="approval-unavailable">Approve work and release payment</button>
        <p id="approval-unavailable">Approval and payment release are not available yet. Your review does not move any funds.</p>
      </div>
    </section>
  );
}
