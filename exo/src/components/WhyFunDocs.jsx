import { ArrowUpRight } from "lucide-react";

export default function WhyFunDocs() {
  return (
    <section className="why section-pad" id="why-fundocs">
      <div className="why-glow" />
      <div className="section-label"><span className="label-dot" />THE FUNDOCS DIFFERENCE</div>
      <div className="why-content">
        <h2>Your mind is<br /><span className="accent-text">your advantage.</span></h2>
        <p>Learning isn't one-size-fits-all. Your tools shouldn't be either. Explore a more flexible, focused, and accessible way to work with information.</p>
        <div className="why-tags">
          <span>Personalized learning</span><span>Better retention</span><span>Accessible by design</span><span>Focus first</span>
        </div>
        <a href="#contact" className="primary-button">Start your journey <ArrowUpRight size={17} /></a>
      </div>
    </section>
  );
}