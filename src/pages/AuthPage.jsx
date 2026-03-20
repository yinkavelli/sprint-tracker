import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hashPassword, createUser, verifyUser } from "../services/DataService";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #111827 inset !important;
    -webkit-text-fill-color: #e8e6e1 !important;
  }
`;

function validate(mode, fields) {
  const errs = {};
  if (mode === "signup" && !fields.name.trim()) errs.name = "Name is required";
  if (!fields.email.trim()) errs.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errs.email = "Enter a valid email";
  if (!fields.password) errs.password = "Password is required";
  else if (fields.password.length < 8) errs.password = "Password must be at least 8 characters";
  if (mode === "signup" && fields.password !== fields.confirm)
    errs.confirm = "Passwords do not match";
  return errs;
}

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [fields, setFields] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  function set(key, value) {
    setFields((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
    setServerError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(mode, fields);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setServerError("");
    try {
      let user;
      if (mode === "signup") {
        user = await createUser({ name: fields.name.trim(), email: fields.email.trim(), password: fields.password });
      } else {
        user = await verifyUser({ email: fields.email.trim(), password: fields.password });
      }
      login(user);
      navigate("/dashboard");
    } catch (err) {
      if (err.message === "EMAIL_EXISTS") setServerError("An account with this email already exists.");
      else if (err.message === "INVALID_CREDENTIALS") setServerError("Incorrect email or password.");
      else setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m) {
    setMode(m);
    setErrors({});
    setServerError("");
    setFields({ name: "", email: "", password: "", confirm: "" });
  }

  const inputStyle = (key) => ({
    width: "100%", padding: "12px 14px", borderRadius: 8, fontSize: 14,
    background: "#111827", color: "#e8e6e1", outline: "none",
    border: `1px solid ${errors[key] ? "#ff4757" : "rgba(255,255,255,0.12)"}`,
    transition: "border-color 0.2s",
    fontFamily: "'DM Sans', sans-serif",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{STYLE}</style>

      {/* Logo */}
      <div style={{ marginBottom: 36, textAlign: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: "#c9a84c", lineHeight: 1 }}>
          Sprint Tracker
        </div>
        <div style={{ fontSize: 12, color: "#6a6a7a", marginTop: 6 }}>Personal goal management, powered by AI</div>
      </div>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "36px 32px" }}>

        {/* Tab toggle */}
        <div style={{ display: "flex", marginBottom: 28, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 4 }}>
          {["login", "signup"].map((m) => (
            <button key={m} onClick={() => switchMode(m)} style={{
              flex: 1, padding: "9px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
              background: mode === m ? "rgba(201,168,76,0.2)" : "transparent",
              color: mode === m ? "#c9a84c" : "#6a6a7a",
              transition: "all 0.2s",
            }}>
              {m === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8a9a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Full Name</label>
              <input type="text" value={fields.name} onChange={(e) => set("name", e.target.value)} placeholder="Yinka Velli" style={inputStyle("name")} autoComplete="name" />
              {errors.name && <div style={{ color: "#ff4757", fontSize: 11, marginTop: 4 }}>{errors.name}</div>}
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8a9a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Email</label>
            <input type="email" value={fields.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" style={inputStyle("email")} autoComplete="email" />
            {errors.email && <div style={{ color: "#ff4757", fontSize: 11, marginTop: 4 }}>{errors.email}</div>}
          </div>

          <div style={{ marginBottom: mode === "signup" ? 18 : 28 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8a9a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Password</label>
            <input type="password" value={fields.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 8 characters" style={inputStyle("password")} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            {errors.password && <div style={{ color: "#ff4757", fontSize: 11, marginTop: 4 }}>{errors.password}</div>}
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8a9a", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Confirm Password</label>
              <input type="password" value={fields.confirm} onChange={(e) => set("confirm", e.target.value)} placeholder="Repeat your password" style={inputStyle("confirm")} autoComplete="new-password" />
              {errors.confirm && <div style={{ color: "#ff4757", fontSize: 11, marginTop: 4 }}>{errors.confirm}</div>}
            </div>
          )}

          {serverError && (
            <div style={{ marginBottom: 18, padding: "10px 14px", borderRadius: 8, background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.25)", color: "#ff4757", fontSize: 13 }}>
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            onMouseEnter={() => setHovered("submit")}
            onMouseLeave={() => setHovered("")}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer",
              background: hovered === "submit" && !loading ? "linear-gradient(135deg, #d4b05a, #c9a84c)" : "linear-gradient(135deg, #c9a84c, #a8863e)",
              color: "#0a0a0f", fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s", opacity: loading ? 0.7 : 1,
            }}>
            {loading ? (mode === "signup" ? "Creating account…" : "Signing in…") : (mode === "signup" ? "Create Account" : "Log In")}
          </button>
        </form>
      </div>
    </div>
  );
}
