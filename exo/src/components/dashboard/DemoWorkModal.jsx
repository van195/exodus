import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { ACCEPTED_FILES, validateDeliverable } from '../../services/deliverableService';
import { canUploadDemoWork, canApproveDemoWork, readDemoFile, saveDemoFile } from '../../services/demoDeliverables';

export default function DemoWorkModal({ project, role, onClose, onSubmitted, onApprove }) {
  const [file, setFile] = useState(null);
  const [saved, setSaved] = useState(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const inFlight = useRef(false);
  const uploading = canUploadDemoWork(project, role);
  const deliverable = project.deliverable;
  useEffect(() => {
    if (!deliverable?.id) return;
    let cancelled = false;
    let objectUrl;
    readDemoFile(deliverable.id, project.id).then((record) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(record.blob);
      setSaved(record); setUrl(objectUrl);
    }).catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [deliverable?.id, project.id]);

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const validation = validateDeliverable(file);
    setError(validation);
    if (validation || !uploading) return;
    inFlight.current = true; setBusy(true);
    try {
      const metadata = await saveDemoFile(project, role, file);
      onSubmitted(metadata);
    } catch (err) { setError(err.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const canApprove = saved && opened && reviewed && canApproveDemoWork(project, role, saved.id);
  return (
    <Modal title={uploading ? 'Submit completed project' : 'Review submitted project'} onClose={busy ? () => {} : onClose}>
      <div className="modal-body demo-work">
        <h3>{project.title}</h3>
        <p className="modal-note">Test mode: files are saved in this browser. Uploading submits work for review; completion and simulated payment release require client approval.</p>
        {uploading ? <form onSubmit={submit} className="demo-work-form">
          <label htmlFor="demo-work-file">Completed project file</label>
          <input id="demo-work-file" type="file" accept={ACCEPTED_FILES} disabled={busy}
            onChange={(event) => {
              const next = event.target.files?.[0] || null;
              setFile(next); setError(next ? validateDeliverable(next) : '');
            }} />
          <p>ZIP, PDF, DOCX, PNG, or JPEG. Maximum 10 MB.</p>
          {file && <p>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
          <button type="submit" className="btn btn--grad" disabled={busy || !file || Boolean(validateDeliverable(file))}>
            {busy ? 'Saving file…' : 'Upload and submit for review'}
          </button>
        </form> : <>
          {!deliverable && <p>No completed project file has been uploaded. Approval is unavailable until an actual file is submitted.</p>}
          {deliverable && <section className="demo-work-file">
            <h4>{deliverable.name}</h4>
            <p>{(deliverable.size / 1024 / 1024).toFixed(2)} MB · Submitted {new Date(deliverable.submittedAt).toLocaleString()}</p>
            {!url && !error && <p role="status">Loading submitted file…</p>}
            {url && <>
              {['image/png', 'image/jpeg'].includes(saved.type) && <img src={url} alt={`Submitted project: ${saved.name}`} />}
              {saved.type === 'application/pdf' && <iframe title={`Preview of ${saved.name}`} src={url} sandbox="" />}
              <div className="modal-actions">
                <a className="btn btn--ghost" href={url} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)}>Open file</a>
                <a className="btn btn--ghost" href={url} download={saved.name} onClick={() => setOpened(true)}>Download project</a>
              </div>
              {saved.name.toLowerCase().endsWith('.zip') && <p>Download and extract the ZIP to inspect and run the completed project. ZIP contents cannot be run directly on this page.</p>}
            </>}
          </section>}
          {role === 'client' && project.clientId === 'me' && project.status === 'delivered' && <>
            <label className="demo-review-check">
              <input type="checkbox" checked={reviewed} disabled={!saved || !opened}
                onChange={(event) => setReviewed(event.target.checked)} />
              <span>I opened or downloaded the files, tested the project, and confirm it meets the agreed requirements.</span>
            </label>
            <p>Open or download the submission, then confirm your review to enable approval.</p>
            <button type="button" className="btn btn--grad" disabled={!canApprove} onClick={() => onApprove(saved.id)}>Approve work and continue to release</button>
          </>}
          {project.status === 'released' && <p>Client approved. Project completed and demo payment released.</p>}
        </>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
