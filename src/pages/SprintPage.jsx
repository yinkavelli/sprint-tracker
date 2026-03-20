import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSprintById, updateSprintChecked, updateSprintStartDate, saveSprint } from "../services/DataService";
import SprintTracker from "../components/SprintTracker";

export default function SprintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const s = getSprintById(id);
    if (!s) { setNotFound(true); return; }
    setSprint(s);
  }, [id]);

  function handleCheckedChange(checked) {
    updateSprintChecked(id, checked);
    setSprint((prev) => ({ ...prev, checked }));
  }

  function handleStartDateChange(startDate) {
    updateSprintStartDate(id, startDate);
    setSprint((prev) => ({ ...prev, startDate }));
  }

  function handleReset() {
    const fresh = {};
    sprint.periods.forEach((p) => {
      Object.keys(p.tracks).forEach((tk) => {
        p.tracks[tk].forEach((_, idx) => {
          fresh[`${p.period}-${tk}-${idx}`] = false;
        });
      });
    });
    const updated = { ...sprint, checked: fresh, startDate: "" };
    saveSprint(updated);
    setSprint(updated);
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#e8e6e1", fontFamily: "'DM Sans', sans-serif", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Sprint not found</div>
        <button onClick={() => navigate("/dashboard")} style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", padding: "10px 22px", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>← Back to Dashboard</button>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(201,168,76,0.3)", borderTopColor: "#c9a84c", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Back bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "#0a0a0f", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => navigate("/dashboard")}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)", color: "#8a8a9a",
            padding: "6px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer",
            transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif",
          }}>
          ← Dashboard
        </button>
        <span style={{ fontSize: 12, color: "#4a4a5a" }}>sprint / {sprint.title}</span>
      </div>

      <SprintTracker
        sprint={sprint}
        onCheckedChange={handleCheckedChange}
        onStartDateChange={handleStartDateChange}
        onReset={handleReset}
      />
    </div>
  );
}
