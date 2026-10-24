import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

const digits = (s) => String(s || "").replace(/[^\d+]/g, "");
// 0911223344 -> 251911223344 (for Telegram links)
const international = (s) => {
  const d = digits(s).replace("+", "");
  return d.startsWith("251") ? d : `251${d.replace(/^0/, "")}`;
};
const stamp = (at) =>
  new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function ContactModal({ project: p, role, onSend, onClose }) {
  const [text, setText] = useState("");
  const threadRef = useRef(null);
  const messages = p.messages || [];

  const other =
    role === "developer"
      ? { title: "Client", name: p.clientName, phone: p.contactPhone, email: p.contactEmail }
      : { title: "Developer", name: p.developerName, phone: p.developerPhone, email: p.developerEmail };

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  return (
    <Modal title={role === "developer" ? "Contact client" : "Message developer"} onClose={onClose}>
      <div className="modal-body">
        <div className="person">
          <div className="person-avatar" aria-hidden="true">{(other.name || "?").charAt(0).toUpperCase()}</div>
          <div className="person-info">
            <strong>{other.name}</strong>
            <span>{other.title} for “{p.title}”</span>
          </div>
        </div>

        <div className="contact-links">
          {other.phone ? (
            <>
              <a className="btn btn--ghost" href={`tel:${digits(other.phone)}`}>Call {other.phone}</a>
              <a className="btn btn--ghost" href={`https://t.me/+${international(other.phone)}`} target="_blank" rel="noreferrer">Telegram</a>
            </>
          ) : (
            <p className="modal-note">No phone number shared. Use the chat below.</p>
          )}
          {other.email && <a className="btn btn--ghost" href={`mailto:${other.email}`}>Email</a>}
        </div>

        <div className="thread" ref={threadRef} aria-live="polite" aria-label="Messages">
          {messages.length === 0 && (
            <p className="thread-empty">No messages yet. Say hello and agree on the details here, so both sides have a record.</p>
          )}
          {messages.map((m, i) => (
            <div key={`${m.at}-${i}`} className={`bubble ${m.from === role ? "bubble--me" : ""}`}>
              <p>{m.text}</p>
              <time>{stamp(m.at)}</time>
            </div>
          ))}
        </div>

        <form className="composer" onSubmit={submit}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500}
                 placeholder="Write a message" aria-label="Write a message" />
          <button type="submit" className="btn btn--grad" disabled={!text.trim()}>Send</button>
        </form>
      </div>
    </Modal>
  );
}
