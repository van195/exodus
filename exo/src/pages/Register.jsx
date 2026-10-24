import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { Field, PasswordField, SubmitButton } from "../components/Field";
import { isEmail, passwordScore } from "../utils/validators";
import { apiRequest } from "../services/api";
import DemoAccess from "../components/DemoAccess";

const ROLES = [
  { value: "developer", title: "Developer", text: "I build software and get paid" },
  { value: "client", title: "Client", text: "I need software built" },
];
const STRENGTH = ["Too weak", "Weak", "Fair", "Good", "Strong"];

const validate = (v) => {
  const e = {};
  if (!v.fullName.trim()) e.fullName = "Enter your full name.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!isEmail(v.email)) e.email = "Enter a valid email, like name@example.com.";
  if (v.password.length < 12 || !/[a-z]/.test(v.password) || !/[A-Z]/.test(v.password)
      || !/\d/.test(v.password) || !/[^A-Za-z0-9]/.test(v.password)
      || new TextEncoder().encode(v.password).length > 72) {
    e.password = "Use 12 or more characters with uppercase, lowercase, a number, and a symbol (maximum 72 UTF-8 bytes).";
  }
  if (!v.confirm) e.confirm = "Re-enter your password.";
  else if (v.confirm !== v.password) e.confirm = "The passwords don't match.";
  if (!v.terms) e.terms = "Accept the terms to continue.";
  return e;
};

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    role: "developer", fullName: "", email: "", password: "", confirm: "", terms: false,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const score = passwordScore(values.password);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const next = { ...values, [name]: type === "checkbox" ? checked : value };
    setValues(next);
    if (Object.keys(errors).length) setErrors(validate(next));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await apiRequest("/auth/register", {
        token: null,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName.trim(), email: values.email.trim(),
          password: values.password, confirmPassword: values.confirm,
          role: values.role === "developer" ? "FREELANCER" : "CLIENT",
        }),
      });
      navigate("/login");
    } catch (error) {
      setFormError(error.message || "We couldn't create your account. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join as a developer or a client. It takes a minute."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <DemoAccess register />
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="roles">
          <legend>I am a</legend>
          {ROLES.map((r) => (
            <label key={r.value} className={`role ${values.role === r.value ? "role--on" : ""}`}>
              <input type="radio" name="role" value={r.value}
                     checked={values.role === r.value} onChange={handleChange} />
              <strong>{r.title}</strong>
              <span>{r.text}</span>
            </label>
          ))}
        </fieldset>

        <Field label="Full name" name="fullName" autoComplete="name" placeholder="Your full name"
               value={values.fullName} onChange={handleChange} error={errors.fullName} />
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="name@example.com"
               value={values.email} onChange={handleChange} error={errors.email} />

        <div className="auth-two">
          <PasswordField label="Password" name="password" autoComplete="new-password"
                         placeholder="At least 12 characters" value={values.password}
                         onChange={handleChange} error={errors.password}>
            {values.password && (
              <div className="meter" data-score={score} aria-live="polite">
                <div className="meter-bars"><i /><i /><i /><i /></div>
                <small>{STRENGTH[score]}</small>
              </div>
            )}
          </PasswordField>
          <PasswordField label="Confirm password" name="confirm" autoComplete="new-password"
                         placeholder="Repeat password" value={values.confirm}
                         onChange={handleChange} error={errors.confirm} />
        </div>

        <div className="terms">
          <label className="check">
            <input type="checkbox" name="terms" checked={values.terms} onChange={handleChange} />
            <span>I agree to the <Link to="/terms" className="auth-link">terms</Link> and <Link to="/privacy" className="auth-link">privacy policy</Link></span>
          </label>
          {errors.terms && <small className="field-error" role="alert">{errors.terms}</small>}
        </div>

        {formError && <p className="form-error" role="alert">{formError}</p>}
        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>
    </AuthLayout>
  );
}
