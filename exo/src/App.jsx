import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import OurStory from "./components/OurStory";
import Mission from "./components/Mission";
import HowItWorks from "./components/HowItWorks";
import WhyFunDocs from "./components/WhyFunDocs";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./components/Dashboard";
import ProjectDeliverables from "./pages/ProjectDeliverables";
import "./App.css";

function Home() {
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

<Route path="/dashboard" element={<Dashboard />} />
      <Route path="/projects" element={<ProjectDeliverables />} />
      <Route path="/projects/:projectId" element={<ProjectDeliverables />} />
    </Routes>
  );
}
