import { ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="footer-main">
        <a href="#home" className="footer-brand"><span className="footer-symbol">Æ.</span><span>Exodus</span></a>
        <p>Learn with purpose.<br />Remember what matters.</p>
        <a href="mailto:hello@fundocs.com" className="footer-contact">Get in touch <ArrowUpRight size={17} /></a>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} FunDocs</span><span>BUILT FOR MIND .</span><a href="#home">BACK TO TOP ↑</a>
      </div>
    </footer>
  );
}