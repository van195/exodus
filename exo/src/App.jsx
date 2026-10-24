import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import OurStory from "./components/OurStory";
import Mission from "./components/Mission";
import HowItWorks from "./components/HowItWorks";
import WhyFunDocs from "./components/WhyFunDocs";
import Footer from "./components/Footer";
import "./App.css";

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <OurStory />
        <Mission />
        <HowItWorks />
        <WhyFunDocs />
      </main>
      <Footer />
    </>
  );
}