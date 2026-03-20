import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSprintsForUser, deleteSprint } from "../services/DataService";
import SprintCard from "../components/SprintCard";
import ConfirmModal from "../components/ConfirmModal";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sprints, setSprints] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [hovered, setHovered] = useState("");

  useEffect(() => {
    setSprints(getSprintsForUser(user.id));
  }, [user.id]);

  function handleDelete(id) {
    deleteSprint(id);
    setSprints(getSprintsForUser(user.id));
    setDeleteTarget(null);
  }

  function handleLogout() {
    logout();
    navigate("/auth");
  }

  const initials = user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", color: "#e8e6e1" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", borderBottom: "2px solid #c9a84c", padding: "18px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: "#c9a84c" }}>Sprint Tracker</div>
            <div style={{ fontSize: 12, color: "#6a6a7a", marginTop: 2 }}>Your personal goal command centre</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #c9a84c, #a8863e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#0a0a0f" }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e6e1" }}>{user.name}</div>
                <div style={{ fontSize: 11, color: "#6a6a7a" }}>{sprints.length} sprint{sprints.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              onMouseEnter={() => setHovered("logout")}
              onMouseLeave={() => setHovered("")}
              style={{
                background: hovered === "logout" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)", color: "#8a8a9a",
                padding: "7px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", transition: "all 0.2s",
              }}>
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 60px" }}>

        {/* Page title */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e8e6e1" }}>My Sprints</h1>
            <div style={{ fontSize: 13, color: "#6a6a7a", marginTop: 4 }}>
              {sprints.length === 0 ? "Start your first sprint below" : `${sprints.length} active goal${sprints.length !== 1 ? "s" : ""}`}
            </div>
          </div>
        </div>

        {/* Sprint grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>

          {/* New sprint card */}
          <button
            onClick={() => navigate("/sprint/new")}
            onMouseEnter={() => setHovered("new")}
            onMouseLeave={() => setHovered("")}
            style={{
              background: hovered === "new" ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)",
              border: `2px dashed ${hovered === "new" ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 16, padding: "36px 24px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 12, minHeight: 220, transition: "all 0.25s", color: "inherit",
            }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: hovered === "new" ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, transition: "all 0.25s" }}>
              +
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: hovered === "new" ? "#c9a84c" : "#8a8a9a", transition: "all 0.2s" }}>New Sprint</div>
              <div style={{ fontSize: 12, color: "#4a4a5a", marginTop: 4 }}>AI-guided setup · 2 minutes</div>
            </div>
          </button>

          {/* Existing sprint cards */}
          {sprints.map((sprint) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              onOpen={() => navigate(`/sprint/${sprint.id}`)}
              onDelete={() => setDeleteTarget(sprint)}
            />
          ))}
        </div>

        {/* Empty state */}
        {sprints.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 60, color: "#4a4a5a" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#6a6a7a", marginBottom: 8 }}>No sprints yet</div>
            <div style={{ fontSize: 13, color: "#4a4a5a" }}>Click "New Sprint" and our AI will build your personalised 6-month plan in minutes.</div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete this sprint?"
        message={`"${deleteTarget?.title}" and all its progress will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Sprint"
        confirmDanger
        onConfirm={() => handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
