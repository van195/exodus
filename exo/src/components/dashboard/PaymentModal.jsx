import { useState } from "react";
import Modal from "./Modal";
import { formatMoney } from "../../utils/format";

const METHODS = ["Telebirr", "CBE Birr", "Bank transfer"];

const COPY = {
  fund: {
    title: "Fund escrow",
    button: (amount) => `Pay ${amount} into escrow`,
    text: "Your money is held by Exodus and only released when you approve the delivery. If the project isn't delivered, you can get it back.",
  },
  release: {
    title: "Release payment",
    button: (amount) => `Release ${amount}`,
    text: "Approve the delivery and send the money to the developer. This can't be undone.",
  },
  refund: {
    title: "Request refund",
    button: (amount) => `Refund ${amount}`,
    text: "The deadline has passed without delivery being approved. The money in escrow will be returned to you.",
  },
};

export default function PaymentModal({ mode, project, onClose, onConfirm }) {
  const [method, setMethod] = useState(METHODS[0]);
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const copy = COPY[mode];
  const amount = formatMoney(project.budget);

  const confirm = () => {
    const digits = account.replace(/\D/g, "");
    if (mode === "fund" && digits.length < 9) {
      setError("Enter a valid phone or account number (at least 9 digits).");
      return;
    }
    setError("");
    setBusy(true);
    // Simulated payment. Replace with the real payment provider call.
    const details = mode === "fund" ? { method, account: `•••• ${digits.slice(-4)}` } : {};
    setTimeout(() => onConfirm(details), 1100);
  };

  return (
    <Modal title={copy.title} onClose={busy ? () => {} : onClose}>
      <div className="modal-body">
        <dl className="summary">
          <div><dt>Project</dt><dd>{project.title}</dd></div>
          {project.developerName && <div><dt>Developer</dt><dd>{project.developerName}</dd></div>}
          <div><dt>Amount</dt><dd className="summary-amount">{amount}</dd></div>
        </dl>

        <p className="modal-note">{copy.text}</p>

        {mode === "fund" && (
          <>
            <fieldset className="methods">
              <legend>Payment method</legend>
              {METHODS.map((m) => (
                <label key={m} className={`method ${method === m ? "method--on" : ""}`}>
                  <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
                  {m}
                </label>
              ))}
            </fieldset>
            <div className={`d-field ${error ? "d-field--error" : ""}`}>
              <label htmlFor="pay-account">Phone or account number</label>
              <input id="pay-account" inputMode="numeric" value={account}
                     onChange={(e) => setAccount(e.target.value)} placeholder="09XXXXXXXX" />
              {error && <small role="alert">{error}</small>}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn--grad" onClick={confirm} disabled={busy}>
            {busy ? <><i className="spinner" /> Processing</> : copy.button(amount)}
          </button>
        </div>
      </div>
    </Modal>
  );
}
