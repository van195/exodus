import { formatDate, formatMoney, isOverdue } from "../../utils/format";

const STEPS = ["Posted", "Accepted", "Funded", "Submitted", "Approved / Paid"];
const INDEX = { open: 0, accepted: 1, funded: 2, delivered: 3, released: 4 };
const LABEL = {
  open: "Open", accepted: "Awaiting funds", funded: "In escrow",
  delivered: "Awaiting review", released: "Completed / Paid", refunded: "Refunded",
};

function getActions(role, p) {
  const overdue = isOverdue(p.deadline);

  if (role === "developer") {
    if (p.status === "open") return { primary: { label: "Accept project", type: "accept" } };
    if (p.status === "accepted") return { note: "Waiting for the client to fund escrow." };
    if (p.status === "funded") return { primary: { label: "Upload completed project", type: "deliver" }, note: "Submit the project files so the client can review your work." };
    if (p.status === "delivered") return { note: "Waiting for the client to approve and release payment." };
    if (p.status === "released") return { note: `You were paid ${formatMoney(p.budget)}.`, tone: "ok" };
    return { note: "The payment was returned to the client." };
  }

  if (p.status === "open") return { note: "Waiting for a developer to accept." };
  if (p.status === "accepted") return { primary: { label: "Fund escrow", type: "fund" }, note: `${p.developerName} accepted. Fund escrow so work can start.` };
  if (p.status === "funded")
    return overdue
      ? { secondary: { label: "Request refund", type: "refund" }, note: "The deadline has passed. You can ask for your money back." }
      : { note: "Your money is held safely until you approve the delivery." };
  if (p.status === "delivered") return { primary: { label: "Review submitted project", type: "review" }, note: "Open and test the submitted files before approving completion." };
  if (p.status === "released") return { note: "Payment released to the developer.", tone: "ok" };
  return { note: "The money was returned to you.", tone: "ok" };
}

export default function ProjectCard({ project: p, role, onAction }) {
  const { primary, secondary, note, tone } = getActions(role, p);
  const current = INDEX[p.status];
  const late = isOverdue(p.deadline) && !["released", "refunded"].includes(p.status);
  const receiptCount = (p.receipts || []).length;
  // Contact unlocks only after a developer is assigned to the project
  const canContact = p.status !== "open" && (role === "client" ? Boolean(p.developerId) : p.developerId === "me");

  return (
    <article className="card">
      <header className="card-head">
        <span className="chip">{p.category}</span>
        <span className={`badge badge--${p.status}`}>{LABEL[p.status]}</span>
      </header>

      <h3>{p.title}</h3>
      <p className="card-desc">{p.description}</p>

      <dl className="card-meta">
        <div><dt>Budget</dt><dd>{formatMoney(p.budget)}</dd></div>
        <div><dt>Deadline</dt><dd className={late ? "late" : ""}>{formatDate(p.deadline)}{late ? " (late)" : ""}</dd></div>
        <div><dt>Client</dt><dd>{p.clientName}</dd></div>
        <div><dt>Developer</dt><dd>{p.developerName || "Not assigned"}</dd></div>
      </dl>

      {p.status !== "refunded" && (
        <ol className="steps" aria-label="Project progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i <= current ? "steps-done" : ""} aria-current={i === current ? "step" : undefined}>
              <i /><span>{s}</span>
            </li>
          ))}
        </ol>
      )}

      {(canContact || receiptCount > 0 || p.deliverable) && (
        <div className="card-links">
          {p.deliverable && <button type="button" onClick={() => onAction("review", p)}>View project files</button>}
          {canContact && (
            <button type="button" onClick={() => onAction("contact", p)}>
              {role === "developer" ? "Contact client" : "Message developer"}
            </button>
          )}
          {receiptCount > 0 && (
            <button type="button" onClick={() => onAction("receipt", p)}>
              {receiptCount === 1 ? "View receipt" : `Receipts (${receiptCount})`}
            </button>
          )}
        </div>
      )}

      <footer className="card-foot">
        {note && <p className={`card-note ${tone === "ok" ? "card-note--ok" : ""}`}>{note}</p>}
        <div className="card-buttons">
          {secondary && <button type="button" className="btn btn--ghost" onClick={() => onAction(secondary.type, p)}>{secondary.label}</button>}
          {primary && <button type="button" className="btn btn--grad" onClick={() => onAction(primary.type, p)}>{primary.label}</button>}
        </div>
      </footer>
    </article>
  );
}
