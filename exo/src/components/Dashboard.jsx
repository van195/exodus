import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import ProjectCard from "../components/dashboard/ProjectCard";
import ProjectForm from "../components/dashboard/ProjectForm";
import PaymentModal from "../components/dashboard/PaymentModal";
import ReceiptModal from "../components/dashboard/ReceiptModal";
import ContactModal from "../components/dashboard/ContactModal";
import DemoWorkModal from "../components/dashboard/DemoWorkModal";
import { canApproveDemoWork } from "../services/demoDeliverables";
import { formatMoney } from "../utils/format";
import { clearDemoSession, getDemoUser } from "../services/demoSession";
import "../styles/dashboard.css";
import "../styles/dashboard-extra.css";

const FILTERS = [
  { id: "all", label: "All", test: () => true },
  { id: "open", label: "Open", test: (p) => p.status === "open" },
  { id: "progress", label: "In progress", test: (p) => ["accepted", "funded", "delivered"].includes(p.status) },
  { id: "done", label: "Completed", test: (p) => ["released", "refunded"].includes(p.status) },
];

const DONE_MESSAGE = {
  fund: "Escrow funded. The developer can start building.",
  release: "Payment released to the developer.",
  refund: "Refund processed. The money is back with you.",
};

const PAYMENT_MODES = ["fund", "release", "refund"];
const sum = (list) => list.reduce((total, p) => total + p.budget, 0);

export default function Dashboard() {
  const store = useProjects();
  const [demoUser] = useState(getDemoUser);
  const [role, setRole] = useState(() => getDemoUser()?.role || "client");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Client sees their own requests. Developer sees open jobs plus their own jobs.
  const scoped = useMemo(
    () =>
      store.projects.filter((p) =>
        role === "client" ? p.clientId === "me" : p.status === "open" || p.developerId === "me"
      ),
    [store.projects, role]
  );

  const visible = useMemo(() => {
    const test = FILTERS.find((f) => f.id === filter).test;
    const q = query.trim().toLowerCase();
    return scoped.filter(
      (p) => test(p) && (!q || `${p.title} ${p.clientName} ${p.category}`.toLowerCase().includes(q))
    );
  }, [scoped, filter, query]);

  const stats = useMemo(() => {
    const inEscrow = scoped.filter((p) => ["funded", "delivered"].includes(p.status));
    const paid = scoped.filter((p) => p.status === "released");
    if (role === "client") {
      return [
        { label: "My requests", value: scoped.length },
        { label: "Needs my action", value: scoped.filter((p) => ["accepted", "delivered"].includes(p.status)).length },
        { label: "Held in escrow", value: formatMoney(sum(inEscrow)) },
        { label: "Paid out", value: formatMoney(sum(paid)) },
      ];
    }
    const mine = scoped.filter((p) => p.developerId === "me");
    return [
      { label: "Open jobs", value: scoped.filter((p) => p.status === "open").length },
      { label: "My active jobs", value: mine.filter((p) => ["accepted", "funded", "delivered"].includes(p.status)).length },
      { label: "Secured in escrow", value: formatMoney(sum(mine.filter((p) => ["funded", "delivered"].includes(p.status)))) },
      { label: "Earned", value: formatMoney(sum(mine.filter((p) => p.status === "released"))) },
    ];
  }, [scoped, role]);

  // Receipt and contact modals read the live project, so new messages appear instantly
  const modalProject = modal?.projectId ? store.projects.find((p) => p.id === modal.projectId) : null;

  const handleAction = (type, project) => {
    if (type === "accept") {
      store.accept(project.id);
      setToast("Project accepted. You can now contact the client.");
    } else if (type === "deliver" || type === "review") {
      setModal({ type: "work", projectId: project.id });
    } else if (type === "receipt" || type === "contact") {
      setModal({ type, projectId: project.id });
    } else {
      setModal({ type, project });
    }
  };

  const confirmPayment = (details) => {
    const { type, project } = modal;
    try {
      const receipt = type === "release"
        ? store.release(project, modal.reviewedFileId, role)
        : store[type](project, details);
      setToast(DONE_MESSAGE[type]);
      setModal({ type: "receipt", projectId: project.id, receiptId: receipt.id });
    } catch (error) {
      setToast(error.message);
      setModal({ type: "work", projectId: project.id });
    }
  };

  const submitRequest = (data) => {
    store.create(data);
    setModal(null);
    setFilter("all");
    setToast("Request posted. Developers can now see it.");
  };

  const closeModal = () => setModal(null);

  return (
    <div className="dash">
      <aside className="side">
        <Link to="/" className="side-brand">
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M4 10l12-6 12 6M4 17l12-6 12 6M4 24l12-6 12 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Exodus</span>
        </Link>

        <div className="role" role="group" aria-label="View as">
          <span className="role-label">View as</span>
          <div className="role-switch">
            {["client", "developer"].map((r) => (
              <button key={r} type="button" aria-pressed={role === r}
                      className={role === r ? "on" : ""}
                      onClick={() => { setRole(r); setFilter("all"); setQuery(""); }}>
                {r === "client" ? "Client" : "Developer"}
              </button>
            ))}
          </div>
        </div>

        <nav className="side-nav" aria-label="Dashboard">
          {!demoUser && <Link to="/projects">My project deliverables</Link>}
          <a href="#projects" className="active">Projects</a>
          <Link to="/">Home page</Link>
          <button type="button" onClick={() => { store.reset(); setToast("Demo data reset."); }}>Reset demo data</button>
        </nav>

        <Link to="/login" className="side-logout" onClick={clearDemoSession}>Log out</Link>
      </aside>

      <main className="main" id="projects">
        <div className="demo-banner" role="status">
          <strong>Test mode{demoUser ? ` · ${demoUser.name}` : ""}</strong>
          <p>Changes use browser demo data. No real payments or approvals are processed.</p>
        </div>
        <header className="top">
          <div>
            <h1>{role === "client" ? "Client dashboard" : "Developer dashboard"}</h1>
            <p>
              {role === "client"
                ? "Post what you need, fund escrow, and release payment when the work is done."
                : "Find projects, deliver the work, and get paid from escrow."}
            </p>
          </div>
          {role === "client" && (
            <button type="button" className="btn btn--grad btn--lg" onClick={() => setModal({ type: "new" })}>
              + New request
            </button>
          )}
        </header>

        <section className="stats" aria-label="Summary">
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </section>

        <section className="toolbar">
          <div className="chips" role="group" aria-label="Filter projects">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={filter === f.id ? "on" : ""}
                      aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
                <em>{scoped.filter(f.test).length}</em>
              </button>
            ))}
          </div>
          <input className="search" type="search" placeholder="Search projects"
                 aria-label="Search projects" value={query} onChange={(e) => setQuery(e.target.value)} />
        </section>

        {visible.length ? (
          <section className="grid">
            {visible.map((p) => (
              <ProjectCard key={p.id} project={p} role={role} onAction={handleAction} />
            ))}
          </section>
        ) : (
          <section className="empty">
            <h2>{query ? "No projects match your search" : "Nothing here yet"}</h2>
            <p>
              {query
                ? "Try a different word or clear the search."
                : role === "client"
                ? "Post your first request and developers will see it right away."
                : "New client requests will show up here."}
            </p>
            {role === "client" && !query && (
              <button type="button" className="btn btn--grad" onClick={() => setModal({ type: "new" })}>
                Post a request
              </button>
            )}
          </section>
        )}
      </main>

      {modal?.type === "new" && <ProjectForm onClose={closeModal} onSubmit={submitRequest} />}
      {modal?.type === "work" && modalProject && (
        <DemoWorkModal key={modalProject.id} project={modalProject} role={role} onClose={closeModal}
          onSubmitted={(file) => {
            store.submitWork(modalProject.id, file, role);
            setToast("Project files uploaded. Waiting for client review and approval.");
            setModal(null);
          }}
          onApprove={(fileId) => {
            if (!canApproveDemoWork(modalProject, role, fileId)) return;
            setModal({ type: "release", project: modalProject, reviewedFileId: fileId });
          }} />
      )}
      {PAYMENT_MODES.includes(modal?.type) && (
        <PaymentModal mode={modal.type} project={modal.project} onClose={closeModal} onConfirm={confirmPayment} />
      )}
      {modal?.type === "receipt" && modalProject && (
        <ReceiptModal project={modalProject} initialId={modal.receiptId} onClose={closeModal} />
      )}
      {modal?.type === "contact" && modalProject && (
        <ContactModal project={modalProject} role={role} onClose={closeModal}
                      onSend={(text) => store.sendMessage(modalProject.id, role, text)} />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
