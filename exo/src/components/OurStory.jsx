import { ArrowUpRight } from "lucide-react";

export default function OurStory() {
  return (
    <section className="story section-pad" id="story">
      <div className="section-label"><span className="label-dot" />OUR STORY</div>
      <div className="story-grid">
        <h2>Learning should<br />feel <span className="accent-text">limitless.</span></h2>
        <div className="story-copy">
          <p>Everyone learns differently. Some people remember what they see, others what they hear, and some need a little more time to make a concept click.</p>
          <p>FunDocs is built around that idea: learning should adapt to you, not the other way around. We combine intelligent tools, focused learning, and memorable experiences to make knowledge easier to understand and retain.</p>
          <a href="#mission" className="text-link">Discover our purpose <ArrowUpRight size={17} /></a>
        </div>
      </div>
      <div className="story-bottom"><span>01 / WHO WE ARE</span><span>MADE FOR CURIOUS MINDS.</span></div>
    </section>
  );
}