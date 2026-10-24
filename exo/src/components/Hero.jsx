export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-glow" />
      <svg className="hero-steps" viewBox="0 0 1440 560" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="stepGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d7e0e0" />
            <stop offset="50%" stopColor="#687b72" />
            <stop offset="100%" stopColor="#d7e0e0" />
          </linearGradient>
        </defs>
        <g stroke="url(#stepGradient)" strokeWidth="2" fill="none">
          <path d="M0 65 H160 V145 H335 V225 H490 V325 H645 V430 H800 V325 H955 V225 H1110 V145 H1280 V65 H1440" />
          <path d="M160 145 V560 M335 225 V560 M490 325 V560 M645 430 V560" />
          <path d="M800 430 V560 M955 325 V560 M1110 225 V560 M1280 145 V560" />
        </g>
      </svg>
      <div className="hero-content">
        <p className="eyebrow hero-eyebrow">LEARN DIFFERENTLY. REMEMBER MORE.</p>
        <h1>Built For real-time protection</h1>
        <p className="hero-description"> Bring clarity to every project with transparent payment terms, milestones, and a process designed to build trust..</p>
        <a href="#how-it-works" className="primary-button">Get free trial</a>
        <span className="hero-caption">#first chose</span>
      </div>
      <div className="hero-bottom-label">
        <span>LEARN</span><span className="hero-bottom-line" /><span>GROW</span>
      </div>
    </section>
  );
}