import { useState, useCallback } from "react";
import ConfirmModal from "./ConfirmModal";

// ─── helpers ─────────────────────────────────────────────────────────────

function getBlockLabel(sprint, n) {
  return `${sprint.blockPrefix || "M"}${n}`;
}

function getBlockShortTitle(period) {
  return period.title.split(" ")[0];
}

function getSprintHeaderTitle(sprint) {
  if (sprint.blockCount && sprint.blockLabel) {
    return `${sprint.blockCount}-${sprint.blockLabel} Sprint`;
  }
  return sprint.title;
}

// Time progress for a given period within the sprint
function getPeriodTimeProgress(sprint, periodNum) {
  const startDate = sprint.startDate;
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const daysPerBlock = sprint.blockDaysEach || 30;
  const periodStart = new Date(start);
  periodStart.setDate(periodStart.getDate() + (periodNum - 1) * daysPerBlock);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + daysPerBlock);
  if (now < periodStart) return 0;
  if (now > periodEnd) return 1;
  return (now - periodStart) / (periodEnd - periodStart);
}

function getOverallTimeProgress(sprint) {
  if (!sprint.startDate) return 0;
  const start = new Date(sprint.startDate);
  const now = new Date();
  const totalDays = (sprint.blockCount || 6) * (sprint.blockDaysEach || 30);
  const end = new Date(start);
  end.setDate(end.getDate() + totalDays);
  if (now < start) return 0;
  if (now > end) return 1;
  return (now - start) / (end - start);
}

function getPeriodTaskProgress(sprint, periodNum) {
  const period = sprint.periods?.find((p) => p.period === periodNum);
  if (!period) return 0;
  let total = 0, done = 0;
  Object.keys(period.tracks).forEach((tr) => {
    period.tracks[tr].forEach((_, idx) => {
      total++;
      if (sprint.checked?.[`${periodNum}-${tr}-${idx}`]) done++;
    });
  });
  return total > 0 ? done / total : 0;
}

function getOverallTaskProgress(sprint) {
  const keys = Object.keys(sprint.checked || {});
  if (!keys.length) return 0;
  return keys.filter((k) => sprint.checked[k]).length / keys.length;
}

function getTrackProgress(sprint, trackKey) {
  let total = 0, done = 0;
  (sprint.periods || []).forEach((p) => {
    (p.tracks[trackKey] || []).forEach((_, idx) => {
      total++;
      if (sprint.checked?.[`${p.period}-${trackKey}-${idx}`]) done++;
    });
  });
  return total > 0 ? done / total : 0;
}

// ─── sub-components ───────────────────────────────────────────────────────

function DualProgressBar({ timePct, taskPct, label }) {
  const behind = timePct > 0 && taskPct < timePct;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: behind ? "#ff6b81" : "#6a6a7a" }}>
          {Math.round(taskPct * 100)}% done{behind ? ` · ${Math.round(timePct * 100)}% time elapsed` : ""}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 3, width: `${timePct * 100}%`, background: "#ff4757", opacity: 0.6, transition: "width 0.5s ease" }} />
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 3, width: `${taskPct * 100}%`, background: "#00b894", transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function MetricBar({ label, pct, color }) {
  return (
    <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: "#8a8a9a", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(pct * 100)}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, width: `${pct * 100}%`, background: color, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────

export default function SprintTracker({ sprint, onCheckedChange, onStartDateChange, onReset }) {
  const { periods = [], tracks = {}, checked = {}, startDate = "", title, subtitle } = sprint;

  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [btnHover, setBtnHover] = useState("");

  const overallTime = getOverallTimeProgress(sprint);
  const overallTask = getOverallTaskProgress(sprint);
  const blockLabel = sprint.blockLabel || "Month";
  const blockPrefix = sprint.blockPrefix || "M";
  const sprintDurationLabel = sprint.blockCount
    ? `${sprint.blockCount}-${blockLabel} Sprint`
    : "Sprint";

  const toggle = useCallback((key) => {
    onCheckedChange({ ...checked, [key]: !checked[key] });
  }, [checked, onCheckedChange]);

  function togglePeriod(num) {
    setExpandedPeriod((prev) => (prev === num ? null : num));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e8e6e1", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(78%) sepia(30%) saturate(600%) hue-rotate(5deg); cursor: pointer; }
      `}</style>

      {/* Reset confirmation */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset all progress?"
        message="This will clear all checked tasks and your start date for this sprint. This cannot be undone."
        confirmLabel="Reset Everything"
        confirmDanger
        onConfirm={() => { setShowResetConfirm(false); onReset(); }}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)", borderBottom: "2px solid #c9a84c", padding: "28px 24px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 26, fontWeight: 700, color: "#c9a84c", lineHeight: 1.2 }}>
                {title}
              </div>
              <div style={{ fontSize: 11, color: "#6a6a7a", marginTop: 4 }}>
                {sprintDurationLabel} · {subtitle}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowSettings(!showSettings)} onMouseEnter={() => setBtnHover("s")} onMouseLeave={() => setBtnHover("")} style={{ background: btnHover === "s" ? "rgba(201,168,76,0.28)" : "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>⚙️ Settings</button>
              <button onClick={() => setShowResetConfirm(true)} onMouseEnter={() => setBtnHover("r")} onMouseLeave={() => setBtnHover("")} style={{ background: btnHover === "r" ? "rgba(255,71,87,0.22)" : "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.35)", color: "#ff4757", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>↺ Reset</button>
            </div>
          </div>

          {showSettings && (
            <div style={{ marginTop: 14, padding: 16, background: "rgba(0,0,0,0.3)", borderRadius: 8, border: "1px solid rgba(201,168,76,0.2)" }}>
              <label style={{ fontSize: 12, color: "#8a8a9a", display: "block", marginBottom: 6 }}>
                Sprint start date — sets the time baseline for all progress bars
              </label>
              <input type="date" value={startDate} onChange={(e) => { onStartDateChange(e.target.value); setShowSettings(false); }} style={{ background: "#1a1a2e", border: "1px solid #c9a84c", color: "#e8e6e1", padding: "8px 12px", borderRadius: 6, fontSize: 14, width: "100%", maxWidth: 220 }} />
            </div>
          )}

          {/* Overall progress */}
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <MetricBar label="Time elapsed" pct={overallTime} color="#ff4757" />
            <MetricBar label="Tasks completed" pct={overallTask} color="#00b894" />
          </div>

          {/* Track summaries */}
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {Object.entries(tracks).map(([key, meta]) => {
              const pct = getTrackProgress(sprint, key);
              return (
                <div key={key} style={{ padding: "8px 12px", borderRadius: 6, background: `${meta.color}10`, border: `1px solid ${meta.color}30`, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: meta.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {meta.icon} {meta.label}
                  </div>
                  <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, width: `${pct * 100}%`, background: meta.color, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#8a8a9a", marginTop: 4 }}>{Math.round(pct * 100)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* Period nav — horizontal scroll */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {periods.map((p) => {
            const taskPct = getPeriodTaskProgress(sprint, p.period);
            const timePct = getPeriodTimeProgress(sprint, p.period);
            const isExpanded = expandedPeriod === p.period;
            return (
              <button key={p.period} onClick={() => togglePeriod(p.period)} style={{ flex: "0 0 auto", minWidth: 80, padding: "10px 8px", borderRadius: 8, cursor: "pointer", background: isExpanded ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.03)", border: isExpanded ? "1px solid rgba(201,168,76,0.4)" : "1px solid rgba(255,255,255,0.06)", transition: "all 0.2s", fontFamily: "inherit" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isExpanded ? "#c9a84c" : "#8a8a9a" }}>
                  {blockPrefix}{p.period}
                </div>
                <div style={{ fontSize: 9, color: "#666", marginTop: 2, lineHeight: 1.2 }}>
                  {getBlockShortTitle(p)}
                </div>
                <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: `${Math.max(taskPct, timePct) * 100}%`,
                    background: taskPct >= timePct ? "#00b894" : `linear-gradient(90deg,#00b894 ${(taskPct / Math.max(timePct, 0.01)) * 100}%,#ff4757 ${(taskPct / Math.max(timePct, 0.01)) * 100}%)`,
                    transition: "width 0.5s ease",
                  }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Period cards */}
        {periods.map((p) => {
          const isExpanded = expandedPeriod === p.period;
          const timePct = getPeriodTimeProgress(sprint, p.period);
          const taskPct = getPeriodTaskProgress(sprint, p.period);
          return (
            <div key={p.period} style={{ marginBottom: 12, borderRadius: 12, overflow: "hidden", background: isExpanded ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)", border: isExpanded ? "1px solid rgba(201,168,76,0.25)" : "1px solid rgba(255,255,255,0.05)", transition: "all 0.3s" }}>
              {/* Card header */}
              <div onClick={() => togglePeriod(p.period)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: taskPct === 1 ? "#00b894" : "linear-gradient(135deg,#1a1a2e,#0f3460)", border: taskPct === 1 ? "2px solid #00d2a0" : "2px solid #c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: taskPct === 1 ? "#fff" : "#c9a84c" }}>
                  {taskPct === 1 ? "✓" : `${blockPrefix}${p.period}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#e8e6e1" }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: "#6a6a7a", marginTop: 2 }}>
                    {blockLabel} {p.period} · {p.subtitle}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <DualProgressBar timePct={timePct} taskPct={taskPct} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#8a8a9a", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: "0 20px 20px" }}>
                  {Object.entries(p.tracks).map(([trackKey, items]) => {
                    const meta = tracks[trackKey];
                    if (!meta) return null;
                    return (
                      <div key={trackKey} style={{ marginTop: 12, padding: 14, borderRadius: 8, background: `${meta.color}08`, border: `1px solid ${meta.color}18` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                          {meta.icon} {meta.label}
                        </div>
                        {items.map((item, idx) => {
                          const key = `${p.period}-${trackKey}-${idx}`;
                          const isDone = !!checked[key];
                          return (
                            <div key={key} onClick={() => toggle(key)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", cursor: "pointer", borderBottom: idx < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                              <div style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1, background: isDone ? meta.color : "transparent", border: isDone ? `2px solid ${meta.color}` : "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", fontSize: 12, color: "#fff" }}>
                                {isDone && "✓"}
                              </div>
                              <div style={{ fontSize: 13, lineHeight: 1.5, color: isDone ? "#6a6a7a" : "#d0cec8", textDecoration: isDone ? "line-through" : "none", transition: "all 0.2s" }}>
                                {item}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Milestone */}
                  <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 6, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
                    <div style={{ fontSize: 10, color: "#c9a84c", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      🏁 End of {blockLabel} {p.period}
                    </div>
                    <div style={{ fontSize: 12, color: "#a09880", marginTop: 4 }}>{p.milestone}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
