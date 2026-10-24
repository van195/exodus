import { ArrowUpRight } from "lucide-react";

const steps = [
  { number: "01", title: "Bring your material", text: "Start with your notes, documents, or a topic you want to explore." },
  { number: "02", title: "Learn your way", text: "Explore explanations, translations, and learning tools that fit your needs." },
  { number: "03", title: "Make it stick", text: "Revisit what you've learned and strengthen your understanding through recall." },
];

export default function HowItWorks() {
  return (
    <section className="how section-pad" id="how-it-works">
      <div className="section-label"><span className="label-dot" />HOW IT WORKS</div>
      <div className="how-heading">
        <h2><br />to <span className="accent-text">confident.</span></h2>
        <p>Three steps. One better learning experience.</p>
      </div>
      <div className="steps-list">
        {steps.map((step) => (
          <article className="step-row" key={step.number}>
            <span className="step-number">{step.number}</span><h3>{step.title}</h3>
            <p>{step.text}</p><ArrowUpRight className="step-arrow" size={21} />
          </article>
        ))}
      </div>
    </section>
  );
}