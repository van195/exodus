import { useState } from "react";

export function Field({ label, name, error, hint, ...inputProps }) {
  const id = `field-${name}`;
  return (
    <div className={`field ${error ? "field--error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {hint && !error && <small className="field-hint">{hint}</small>}
      {error && (
        <small id={`${id}-error`} className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

export function PasswordField({ label, name, error, children, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const id = `field-${name}`;
  return (
    <div className={`field ${error ? "field--error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-password">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        <button
          type="button"
          className="field-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {children}
      {error && (
        <small id={`${id}-error`} className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

export function SubmitButton({ loading, children }) {
  return (
    <button type="submit" className="btn-primary" disabled={loading}>
      <span>{loading ? "Please wait" : children}</span>
      <span className="btn-icon" aria-hidden="true">
        {loading ? (
          <i className="spinner" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </span>
    </button>
  );
}
