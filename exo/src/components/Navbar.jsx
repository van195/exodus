import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 54 60" fill="none" role="img" aria-label="FunDocs">
      <path d="M5 17 30 3 49 11 24 25Z" stroke="currentColor" strokeWidth="3" />
      <path d="M5 25 30 11 49 19 24 33Z" stroke="currentColor" strokeWidth="3" />
      <path d="M5 33 30 19 49 27 24 41Z" stroke="currentColor" strokeWidth="3" />
      <path d="M5 41 30 27 49 35 24 49Z" stroke="currentColor" strokeWidth="3" />
      <path d="M5 49 30 35 49 43 24 57Z" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export default function Navbar() {
  return (
    <header className="navbar">
      <a className="brand" href="#home" aria-label="FunDocs home"><Logo /></a>
      <nav className="nav-links" aria-label="Main navigation">
        <a href="#story">Our Story</a>
        <a href="#how-it-works">Service</a>
        <a href="#mission">Mission</a>
        <a href="#why-fundocs">Why FunDocs</a>
        <a href="#contact">Contact</a>
      </nav>
      <Link to="/login" className="join-button">
        <span>Join</span><span className="join-arrow"><ArrowUpRight size={20} /></span>
      </Link>
    </header>
  );
}