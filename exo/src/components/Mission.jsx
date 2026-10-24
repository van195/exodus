import { Brain, Focus, Lightbulb, ArrowUpRight } from "lucide-react";

const cards = [
  { number: "01", title: "Understand", text: "Break complex ideas into clear, approachable explanations that make sense to you.", Icon: Lightbulb },
  { number: "02", title: "Remember", text: "Turn information into lasting knowledge with smarter recall and memorable associations.", Icon: Brain },
  { number: "03", title: "Focus", text: "Create space for meaningful learning by reducing distractions and building better habits.", Icon: Focus },
];

export default function Mission() {
  return (
    <section className="mission section-pad" id="mission">
      <div className="section-label"><span className="label-dot" />OUR MISSION</div>
      <div className="mission-heading">
        <h2>Make knowledge<br /><span className="accent-text">stay with you.</span></h2>
        <p>We want to make learning more accessible, more personal, and more effective — for every kind of mind.</p>
      </div>
      <div className="mission-grid">
        {cards.map(({ number, title, text, Icon }) => (
          <article className="mission-card" key={number}>
            <span className="card-number">{number}</span>
            <div className="card-icon"><Icon size={25} strokeWidth={1.5} /></div>
            <h3>{title}</h3><p>{text}</p>
            <ArrowUpRight className="card-arrow" size={19} />
          </article>
        ))}
      </div>
    </section>
  );
}