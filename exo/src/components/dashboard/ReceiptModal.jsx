import { useState } from "react";
import Modal from "./Modal";
import { formatMoney } from "../../utils/format";

const TITLE = { fund: "Escrow deposit", release: "Payment released", refund: "Refund" };

const when = (at) =>
  new Date(at).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

function parties(p, type) {
  if (type === "fund") return { from: p.clientName, to: "Exodus escrow" };
  if (type === "release") return { from: "Exodus escrow", to: p.developerName };
  return { from: "Exodus escrow", to: p.clientName };
}

export default function ReceiptModal({ project: p, initialId, onClose }) {
  const receipts = p.receipts || [];
  const [activeId, setActiveId] = useState(initialId || receipts[receipts.length - 1]?.id);
  const r = receipts.find((x) => x.id === activeId) || receipts[0];

  if (!r) {
    return (
      <Modal title="Receipts" onClose={onClose}>
        <div className="modal-body">
          <p className="modal-note">No payments yet. A receipt appears here after each payment step.</p>
        </div>
      </Modal>
    );
  }

  const { from, to } = parties(p, r.type);

  return (
    <Modal title="Payment receipt" onClose={onClose}>
      <div className="modal-body">
        {receipts.length > 1 && (
          <div className="receipt-tabs no-print" role="tablist" aria-label="Receipts for this project">
            {receipts.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={x.id === r.id}
                      className={x.id === r.id ? "on" : ""} onClick={() => setActiveId(x.id)}>
                {TITLE[x.type]}
              </button>
            ))}
          </div>
        )}

        <div className="receipt-sheet">
          <div className="receipt-top">
            <span className="receipt-check" aria-hidden="true">✓</span>
            <div>
              <strong>{TITLE[r.type]}</strong>
              <span>Exodus escrow receipt</span>
            </div>
          </div>

          <p className="receipt-amount">{formatMoney(r.amount)}</p>

          <dl className="receipt-rows">
            <div><dt>Receipt no.</dt><dd>{r.id}</dd></div>
            <div><dt>Date</dt><dd>{when(r.at)}</dd></div>
            <div><dt>Project</dt><dd>{p.title}</dd></div>
            <div><dt>From</dt><dd>{from}</dd></div>
            <div><dt>To</dt><dd>{to}</dd></div>
            <div><dt>Method</dt><dd>{r.method}{r.account ? ` ${r.account}` : ""}</dd></div>
            <div><dt>Status</dt><dd>Completed</dd></div>
          </dl>

          <p className="receipt-foot">Demo receipt. No real money was moved.</p>
        </div>

        <div className="modal-actions no-print">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Close</button>
          <button type="button" className="btn btn--grad" onClick={() => window.print()}>Print or save as PDF</button>
        </div>
      </div>
    </Modal>
  );
}
