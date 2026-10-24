import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Field } from "./Field";
import { startDemoSession } from "../services/demoSession";

export default function DemoAccess({ register = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client");
  const [error, setError] = useState("");

  function enter(event) {
    event.preventDefault();
    try {
      startDemoSession({ name, email, role });
      navigate("/dashboard");
    } catch {
      setError("Browser storage is unavailable. Allow storage for this site and try again.");
    }
  }

  return (
    <section className="demo-access" aria-label="Frontend test mode">
      <h2>Test without a database</h2>
      <p>Use any test name or email. No password or existing account is needed. Projects and payments are demo data.</p>
      <button type="button" className="demo-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide test mode" : register ? "Create a test user" : "Log in to test mode"}
      </button>
      {open && <form className="auth-form" onSubmit={enter}>
        <Field name="demoName" label="Test name (optional)" value={name} onChange={(event) => setName(event.target.value)} placeholder="Test user" />
        <Field name="demoEmail" label="Test email (optional)" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tester@example.com" />
        <fieldset className="demo-role">
          <legend>Test as</legend>
          {["client", "developer"].map((value) => <label key={value}>
            <input type="radio" name="demoRole" checked={role === value} onChange={() => setRole(value)} />
            {value === "client" ? "Client" : "Developer"}
          </label>)}
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn-primary">{register ? "Create test user and enter demo" : "Enter demo dashboard"}</button>
      </form>}
    </section>
  );
}
