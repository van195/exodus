import { Link } from "react-router-dom";
import "../styles/auth.css";

// Change this to your platform's real name
const BRAND_NAME = "Exodus";

const STEPS = [
  { title: "Agree on the scope", text: "Developer and client settle the price and deliverables." },
  { title: "Client funds escrow", text: "The money is held safely on the platform, not by either side." },
  { title: "Deliver and get paid", text: "Payment is released when the work is accepted. No delivery, full refund." },
];

function Brand({ className = "" }) {
  return (
    <Link to="/" className={`auth-brand ${className}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M4 10l12-6 12 6M4 17l12-6 12 6M4 24l12-6 12 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{BRAND_NAME}</span>
    </Link>
  );
}

// Stepped lines, the same motif as the home page hero
function StairLines() {
  return (
    <svg className="auth-lines" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke">
        <path d="M0 150H140V230H300V310H430V390H560V470H660" />
        <path d="M1440 150H1300V230H1140V310H1010V390H880V470H780" />
      </g>
    </svg>
  );
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="auth-page">
      <div className="auth-glow" aria-hidden="true" />
      <StairLines />

      <div className="auth-shell">
        <aside className="auth-aside">
          <Brand />
          <div>
            <h2 className="auth-aside-title">Build it. Deliver it. Get paid.</h2>
            <ol className="auth-steps">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="auth-step-num">{i + 1}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <section className="auth-main">
          <Brand className="auth-brand--mobile" />
          <header className="auth-header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>
          {children}
          <p className="auth-footer">{footer}</p>
        </section>
      </div>
    </main>
  );
}
