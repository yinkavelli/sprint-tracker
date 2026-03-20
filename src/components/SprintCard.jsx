import { useState } from "react";

// Circular progress ring component
function Ring({ pct, size = 64, stroke = 5, color = "#c9a84c" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={pct === 1 ? "#00b894" : color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

function getOverallTaskProgress(sprint) {
  const keys = Object.keys(sprint.checked || {});
  if (!keys.length) return 0;
  return keys.filter((k) => sprint.checked[k]).length / keys.length;
}

function getDaysRemaining(sprint) {
  if (!sprint.startDate) return null;
  const end = new Date(sprint.startDate);
  end.setDate(end.getDate() + 180);
  const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function SprintCard({ sprint, onOpen, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pct = getOverallTaskProgress(sprint);
  const days = getDaysRemaining(sprint);

  const trackEntries = Object.entries(sprint.tracks || {});

  function getTrackProgress(trackKey) {
    let total = 0, done = 0;
    (sprint.months || []).forEach((m) => {
      (m.tracks[trackKey] || []).forEach((_, idx) => {
        total++;
        if (sprint.checked?.[`${m.month}-${trackKey}-${idx}`]) done++;
      });
    });
    return total > 0 ? done / total : 0;
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{
        background: hovered ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 16, padding: "22px", cursor: "pointer",
        transition: "all 0.25s",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
        position: "relative", minHeight: 220,
        display: "flex", flexDirection: "column", gap: 16,
      }}>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8e6e1", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {sprint.title}
          </div>
          {sprint.category && (
            <div style={{ fontSize: 10, color: "#6a6a7a", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {sprint.category}
            </div>
          )}
        </div>

        {/* Progress ring */}
        <div style={{ position: "relative" }}>
          <Ring pct={pct} size={58} stroke={5} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: pct === 1 ? "#00b894" : "#c9a84c" }}>
            {Math.round(pct * 100)}%
          </div>
        </div>
      </div>

      {/* Track mini-bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {trackEntries.map(([key, meta]) => {
          const tp = getTrackProgress(key);
          return (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: meta.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "75%" }}>
                  {meta.icon} {meta.label}
                </span>
                <span style={{ fontSize: 10, color: "#6a6a7a" }}>{Math.round(tp * 100)}%</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, width: `${tp * 100}%`, background: meta.color, transition: "width 0.5s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {days !== null ? (
          <div style={{ fontSize: 11, color: days < 0 ? "#ff4757" : days < 14 ? "#fdcb6e" : "#6a6a7a" }}>
            {days < 0 ? "Sprint ended" : days === 0 ? "Last day" : `${days}d remaining`}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#4a4a5a" }}>No start date set</div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            style={{
              background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)",
              color: "#c9a84c", padding: "5px 12px", borderRadius: 6, fontSize: 11,
              fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
            }}>
            Open →
          </button>
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#6a6a7a", width: 28, height: 28, borderRadius: 6, fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
              }}>
              ···
            </button>
            {menuOpen && (
              <div style={{
                position: "absolute", right: 0, bottom: "calc(100% + 6px)", background: "#1a1a2e",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "4px 0",
                minWidth: 130, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "9px 14px",
                    background: "none", border: "none", color: "#ff4757", fontSize: 13,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                  🗑 Delete sprint
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
