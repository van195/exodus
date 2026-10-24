import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { Field, PasswordField, SubmitButton } from "../components/Field";
import { isEmail } from "../utils/validators";
import { apiRequest, saveToken } from "../services/api";
import DemoAccess from "../components/DemoAccess";
import { clearDemoSession } from "../services/demoSession";

const validate = (v) => {
  const e = {};
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!isEmail(v.email)) e.email = "Enter a valid email, like name@example.com.";
  if (!v.password) e.password = "Enter your password.";
  return e;
};

export default function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "", remember: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const next = { ...values, [name]: type === "checkbox" ? checked : value };
    setValues(next);
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: validate(next)[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      const data = await apiRequest("/auth/login", {
        token: null,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim(), password: values.password }),
      });
      if (!data?.token) throw new Error("The server did not return a login session.");
      saveToken(data.token, values.remember);
      clearDemoSession();
      navigate("/dashboard");
    } catch (error) {
      setFormError(error.message || "We couldn't log you in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your projects and payments."
      footer={<>New here? <Link to="/register">Create an account</Link></>}
    >
      <DemoAccess />
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={values.email}
          onChange={handleChange}
          error={errors.email}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
        />

        <div className="auth-row">
          <label className="check">
            <input type="checkbox" name="remember" checked={values.remember} onChange={handleChange} />
            <span>Keep me logged in</span>
          </label>
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
        </div>

        {formError && <p className="form-error" role="alert">{formError}</p>}
        <SubmitButton loading={loading}>Log in</SubmitButton>
      </form>
    </AuthLayout>
  );
}
