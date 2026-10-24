import { useState } from "react";
import Modal from "./Modal";

const CATEGORIES = ["Website", "Mobile app", "Software", "Design", "Other"];

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

// Ethiopian mobile: 09XXXXXXXX, 07XXXXXXXX, +2519XXXXXXXX
const isPhone = (v) => /^(\+251|251|0)?[79]\d{8}$/.test(v.replace(/[\s-]/g, ""));
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

const validate = (v) => {
  const e = {};
  if (v.title.trim().length < 5) e.title = "Enter a project title of at least 5 characters.";
  if (v.description.trim().length < 20) e.description = "Describe what you need in at least 20 characters.";
  if (!v.budget || Number(v.budget) < 500) e.budget = "Enter a budget of at least 500 ETB.";
  if (!v.deadline) e.deadline = "Choose a deadline.";
  else if (new Date(`${v.deadline}T23:59:59`) <= new Date()) e.deadline = "The deadline must be in the future.";
  if (!v.clientName.trim()) e.clientName = "Enter your name or company.";
  if (!isPhone(v.contactPhone)) e.contactPhone = "Enter a valid phone number, like 0911 223 344.";
  if (v.contactEmail.trim() && !isEmail(v.contactEmail)) e.contactEmail = "Enter a valid email or leave it empty.";
  return e;
};

export default function ProjectForm({ onClose, onSubmit }) {
  const [values, setValues] = useState({
    title: "", category: "Website", description: "", budget: "", deadline: "",
    clientName: "", contactPhone: "", contactEmail: "",
  });
  const [errors, setErrors] = useState({});

  const change = (e) => {
    const next = { ...values, [e.target.name]: e.target.value };
    setValues(next);
    if (Object.keys(errors).length) setErrors(validate(next));
  };

  const submit = (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({
      title: values.title.trim(),
      category: values.category,
      description: values.description.trim(),
      budget: Number(values.budget),
      deadline: values.deadline,
      clientName: values.clientName.trim(),
      contactPhone: values.contactPhone.trim(),
      contactEmail: values.contactEmail.trim(),
    });
  };

  const field = (name, label, input) => (
    <div className={`d-field ${errors[name] ? "d-field--error" : ""}`}>
      <label htmlFor={`pf-${name}`}>{label}</label>
      {input}
      {errors[name] && <small role="alert">{errors[name]}</small>}
    </div>
  );

  return (
    <Modal title="New project request" onClose={onClose}>
      <form className="modal-body" onSubmit={submit} noValidate>
        {field("title", "Project title",
          <input id="pf-title" name="title" value={values.title} onChange={change}
                 placeholder="e.g. Pharmacy inventory system" />)}

        <div className="d-two">
          {field("category", "Type of project",
            <select id="pf-category" name="category" value={values.category} onChange={change}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>)}
          {field("clientName", "Your name or company",
            <input id="pf-clientName" name="clientName" value={values.clientName} onChange={change}
                   placeholder="Who is requesting this?" />)}
        </div>

        {field("description", "What should be built?",
          <textarea id="pf-description" name="description" rows="4" value={values.description}
                    onChange={change} placeholder="Describe the features, who will use it, and anything the developer must know." />)}

        <div className="d-two">
          {field("budget", "Budget (ETB)",
            <input id="pf-budget" name="budget" type="number" min="0" inputMode="numeric"
                   value={values.budget} onChange={change} placeholder="e.g. 45000" />)}
          {field("deadline", "Deadline",
            <input id="pf-deadline" name="deadline" type="date" min={tomorrow()}
                   value={values.deadline} onChange={change} />)}
        </div>

        <div className="d-two">
          {field("contactPhone", "Phone number",
            <input id="pf-contactPhone" name="contactPhone" type="tel" inputMode="tel" autoComplete="tel"
                   value={values.contactPhone} onChange={change} placeholder="0911 223 344" />)}
          {field("contactEmail", "Email (optional)",
            <input id="pf-contactEmail" name="contactEmail" type="email" autoComplete="email"
                   value={values.contactEmail} onChange={change} placeholder="name@example.com" />)}
        </div>

        <p className="modal-note">
          Your contact details stay hidden until a developer accepts your project. You pay nothing now. You fund escrow after a developer accepts, and the money is released when you approve the delivery.
        </p>

        <div className="modal-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--grad">Post request</button>
        </div>
      </form>
    </Modal>
  );
}
