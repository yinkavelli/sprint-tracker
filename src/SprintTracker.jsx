import { useState, useEffect, useCallback, useMemo } from "react";

const PLAN_DATA = [
  {
    month: 1,
    title: "Foundation & groundwork",
    subtitle: "Research, register, identify your first site",
    milestone: "Course registered, site shortlisted, LinkedIn updated",
    tracks: {
      certification: [
        "Register for CPSI course on NPPS website",
        "Order the CPSI study guide & standards handbook",
        "Block 3 study days in your calendar this month",
      ],
      build: [
        "Identify 2–3 potential community sites via your foundation",
        "Research local council / municipality playground grant schemes in UAE",
        "Visit potential sites and photograph them",
      ],
      brand: [
        "Update LinkedIn headline to reflect play design direction",
        "Follow top 20 playground designers & firms globally",
        "Join IPEMA and IPA (International Play Association) as a member",
      ],
    },
  },
  {
    month: 2,
    title: "Study, concept & community",
    subtitle: "Deep work month — learn and design simultaneously",
    milestone: "Concept sketched, exam booked, first article published",
    tracks: {
      certification: [
        "Complete CPSI online course modules",
        "Take practice exams (aim for 80%+ consistently)",
        "Book your exam date for end of month 2 or start of month 3",
      ],
      build: [
        "Choose your site — get a verbal commitment from the community partner",
        "Sketch your first themed playground concept (can be hand-drawn)",
        "Identify your theme — ideally tied to one of your children's books",
      ],
      brand: [
        "Write your first LinkedIn article: \"Why I'm building my first playground\"",
        "Start documenting your journey publicly — even the idea stage is content",
        "Connect with 5 CPSI-certified designers and introduce yourself",
      ],
    },
  },
  {
    month: 3,
    title: "Certification & design development",
    subtitle: "Sit the exam. Deepen the concept into a real proposal",
    milestone: "CPSI certified, funding in motion, proposal written",
    tracks: {
      certification: [
        "Sit and pass CPSI exam",
        "Add CPSI credential to LinkedIn, email signature, bio",
        "Begin exploring CPSI renewal CPD requirements",
      ],
      build: [
        "Develop concept into a proper one-page brief with equipment list",
        "Get 2–3 quotes from playground equipment suppliers",
        "Submit funding application or foundation budget request",
      ],
      brand: [
        "Announce CPSI certification publicly on LinkedIn",
        "Pitch one podcast or blog in the early childhood / design space",
        "Begin building a simple one-page website for your consulting brand",
      ],
    },
  },
  {
    month: 4,
    title: "Funding, partners & planning",
    subtitle: "Lock in your first project officially",
    milestone: "Project funded, supplier chosen, website live",
    tracks: {
      certification: [
        "Use CPSI knowledge to do a formal safety audit of your planned site",
        "Document audit as a case study — your first professional output",
        "Look into IPEMA membership for equipment standards access",
      ],
      build: [
        "Secure funding / sponsorship commitment (foundation, CSR partner, or grant)",
        "Select equipment supplier and sign purchase order",
        "Hire a photographer to document the entire build process",
      ],
      brand: [
        "Launch your consulting website (even a simple one-pager)",
        "Post a \"first project announced\" update with renderings or sketches",
        "Identify 3 journalists in design / childhood / UAE lifestyle press",
      ],
    },
  },
  {
    month: 5,
    title: "Build & document",
    subtitle: "Your most important month — the playground goes up",
    milestone: "Playground built, documented, launched publicly",
    tracks: {
      certification: [
        "Conduct formal CPSI pre-installation inspection",
        "Complete post-installation safety inspection and log it",
        "Create a maintenance checklist for the community partner",
      ],
      build: [
        "Oversee installation — be on site every day",
        "Document every stage: before, during, after (photo + video)",
        "Capture children using the space on launch day",
      ],
      brand: [
        "Post real-time build updates on LinkedIn (behind the scenes content)",
        "Film a short 60-second build reel for social media",
        "Invite local press to the opening day",
      ],
    },
  },
  {
    month: 6,
    title: "Publish, pitch & position",
    subtitle: "Turn the build into business momentum",
    milestone: "Case study live, first outreach sent, second project in sight",
    tracks: {
      certification: [
        "Write up your CPSI inspection process as a downloadable resource",
        "Offer free playground safety audits to 2–3 schools near you",
        "Begin positioning yourself as a CPSI voice in your content",
      ],
      build: [
        "Write a full case study: concept → brief → build → impact",
        "Get a written testimonial from the community partner",
        "Begin scoping your second project",
      ],
      brand: [
        "Pitch your story to Dezeen, AD Kids, or regional design press",
        "Send a cold outreach to Kompan and PlayCore with your case study",
        "Apply to speak at 1 early childhood or design conference in 2026",
      ],
    },
  },
];

const TRACK_META = {
  certification: { label: "Certification", color: "#6c5ce7", icon: "🎓" },
  build: { label: "First Build", color: "#00b894", icon: "🏗️" },
  brand: { label: "Brand & Visibility", color: "#0984e3", icon: "📣" },
};

const STORAGE_KEY = "sprint-tracker-state";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function initChecked() {
  const checked = {};
  PLAN_DATA.forEach((m) => {
    Object.entries(m.tracks).forEach(([track, items]) => {
      items.forEach((_, idx) => {
        checked[`${m.month}-${track}-${idx}`] = false;
      });
    });
  });
  return checked;
}

export default function SprintTracker() {
  const saved = useMemo(() => loadState(), []);
  const [checked, setChecked] = useState(saved?.checked || initChecked());
  const [startDate, setStartDate] = useState(saved?.startDate || "");
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [btnHover, setBtnHover] = useState("");

  useEffect(() => {
    saveState({ checked, startDate });
  }, [checked, startDate]);

  const toggle = useCallback((key) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
  }, []);

  // Time progress calculation
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const totalDays = 180;

  function getMonthTimeProgress(monthNum) {
    if (!start) return 0;
    const monthStart = new Date(start);
    monthStart.setDate(monthStart.getDate() + (monthNum - 1) * 30);
    const monthEnd = new Date(monthStart);
    monthEnd.setDate(monthEnd.getDate() + 30);
    if (now < monthStart) return 0;
    if (now > monthEnd) return 1;
    return (now - monthStart) / (monthEnd - monthStart);
  }

  function getOverallTimeProgress() {
    if (!start) return 0;
    const end = new Date(start);
    end.setDate(end.getDate() + totalDays);
    if (now < start) return 0;
    if (now > end) return 1;
    return (now - start) / (end - start);
  }

  function getMonthTaskProgress(monthNum) {
    let total = 0, done = 0;
    const m = PLAN_DATA[monthNum - 1];
    Object.entries(m.tracks).forEach(([track, items]) => {
      items.forEach((_, idx) => {
        total++;
        if (checked[`${monthNum}-${track}-${idx}`]) done++;
      });
    });
    return total > 0 ? done / total : 0;
  }

  function getOverallTaskProgress() {
    const keys = Object.keys(checked);
    if (keys.length === 0) return 0;
    const done = keys.filter((k) => checked[k]).length;
    return done / keys.length;
  }

  function getTrackProgress(track) {
    let total = 0, done = 0;
    PLAN_DATA.forEach((m) => {
      m.tracks[track]?.forEach((_, idx) => {
        total++;
        if (checked[`${m.month}-${track}-${idx}`]) done++;
      });
    });
    return total > 0 ? done / total : 0;
  }

  const resetAll = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setChecked(initChecked());
    setStartDate("");
    setShowResetConfirm(false);
    setExpandedMonth(null);
  };

  const toggleMonth = (month) => {
    setExpandedMonth((prev) => (prev === month ? null : month));
  };

  const overallTime = getOverallTimeProgress();
  const overallTask = getOverallTaskProgress();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e8e6e1",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>

      {/* ── Custom Reset Confirmation Modal ── */}
      {showResetConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#1a1a2e", border: "1px solid rgba(255,71,87,0.3)",
            borderRadius: 12, padding: "28px 32px", maxWidth: 360, width: "90%",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>↺</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e6e1", marginBottom: 8 }}>
              Reset all progress?
            </div>
            <div style={{ fontSize: 13, color: "#8a8a9a", marginBottom: 24, lineHeight: 1.5 }}>
              This will clear all checked tasks and your start date. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  padding: "9px 22px", borderRadius: 7, fontSize: 13, cursor: "pointer",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#e8e6e1", transition: "all 0.2s",
                }}
              >Cancel</button>
              <button
                onClick={confirmReset}
                style={{
                  padding: "9px 22px", borderRadius: 7, fontSize: 13, cursor: "pointer",
                  background: "rgba(255,71,87,0.15)", border: "1px solid rgba(255,71,87,0.4)",
                  color: "#ff4757", fontWeight: 600, transition: "all 0.2s",
                }}
              >Reset Everything</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(78%) sepia(30%) saturate(600%) hue-rotate(5deg) brightness(95%);
          cursor: pointer;
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        borderBottom: "2px solid #c9a84c",
        padding: "28px 24px 24px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontWeight: 700, color: "#c9a84c", lineHeight: 1.1 }}>
                6-Month Sprint Plan
              </div>
              <div style={{ fontSize: 13, color: "#8a8a9a", marginTop: 6 }}>
                From idea stage → certified + first build underway
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                onMouseEnter={() => setBtnHover("settings")}
                onMouseLeave={() => setBtnHover("")}
                style={{
                  background: btnHover === "settings" ? "rgba(201,168,76,0.28)" : "rgba(201,168,76,0.15)",
                  border: "1px solid rgba(201,168,76,0.3)",
                  color: "#c9a84c", padding: "6px 14px", borderRadius: 6, fontSize: 12,
                  cursor: "pointer", transition: "all 0.2s",
                }}>⚙️ Settings</button>
              <button
                onClick={resetAll}
                onMouseEnter={() => setBtnHover("reset")}
                onMouseLeave={() => setBtnHover("")}
                style={{
                  background: btnHover === "reset" ? "rgba(255,71,87,0.22)" : "rgba(255,71,87,0.1)",
                  border: "1px solid rgba(255,71,87,0.35)",
                  color: "#ff4757", padding: "6px 14px", borderRadius: 6, fontSize: 12,
                  cursor: "pointer", transition: "all 0.2s",
                }}>↺ Reset</button>
            </div>
          </div>

          {showSettings && (
            <div style={{
              marginTop: 16, padding: 16, background: "rgba(0,0,0,0.3)",
              borderRadius: 8, border: "1px solid rgba(201,168,76,0.2)",
            }}>
              <label style={{ fontSize: 12, color: "#8a8a9a", display: "block", marginBottom: 6 }}>
                Sprint start date (sets the time baseline for progress bars)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setShowSettings(false); }}
                style={{
                  background: "#1a1a2e", border: "1px solid #c9a84c", color: "#e8e6e1",
                  padding: "8px 12px", borderRadius: 6, fontSize: 14, width: "100%", maxWidth: 220,
                }}
              />
            </div>
          )}

          {/* Overall progress */}
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <ProgressBar label="Time elapsed" timePct={overallTime} taskPct={0} simple />
            <ProgressBar label="Tasks completed" timePct={0} taskPct={overallTask} simple greenOnly />
          </div>

          {/* Track summaries */}
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {Object.entries(TRACK_META).map(([key, meta]) => {
              const pct = getTrackProgress(key);
              return (
                <div key={key} style={{
                  padding: "8px 12px", borderRadius: 6,
                  background: `${meta.color}10`, border: `1px solid ${meta.color}30`,
                  minWidth: 0,
                }}>
                  <div style={{
                    fontSize: 10, color: meta.color, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: 0.5,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {meta.icon} {meta.label}
                  </div>
                  <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2, width: `${pct * 100}%`,
                      background: meta.color, transition: "width 0.5s ease",
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#8a8a9a", marginTop: 4 }}>{Math.round(pct * 100)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>
        {/* Mini month nav — horizontal scroll, never wraps */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 20,
          flexWrap: "nowrap", overflowX: "auto",
          WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}>
          {PLAN_DATA.map((m) => {
            const taskPct = getMonthTaskProgress(m.month);
            const isExpanded = expandedMonth === m.month;
            return (
              <button key={m.month} onClick={() => toggleMonth(m.month)} style={{
                flex: "0 0 auto", minWidth: 80, padding: "10px 8px", borderRadius: 8, cursor: "pointer",
                background: isExpanded ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.03)",
                border: isExpanded ? "1px solid rgba(201,168,76,0.4)" : "1px solid rgba(255,255,255,0.06)",
                transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isExpanded ? "#c9a84c" : "#8a8a9a" }}>M{m.month}</div>
                <div style={{ fontSize: 9, color: "#666", marginTop: 2, lineHeight: 1.2 }}>{m.title.split(" ")[0]}</div>
                <div style={{
                  marginTop: 6, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: `${Math.max(taskPct, getMonthTimeProgress(m.month)) * 100}%`,
                    background: taskPct >= getMonthTimeProgress(m.month) ? "#00b894" :
                      `linear-gradient(90deg, #00b894 ${(taskPct / Math.max(getMonthTimeProgress(m.month), 0.01)) * 100}%, #ff4757 ${(taskPct / Math.max(getMonthTimeProgress(m.month), 0.01)) * 100}%)`,
                    transition: "width 0.5s ease",
                  }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Month cards */}
        {PLAN_DATA.map((m) => {
          const isExpanded = expandedMonth === m.month;
          const timePct = getMonthTimeProgress(m.month);
          const taskPct = getMonthTaskProgress(m.month);

          return (
            <div key={m.month} style={{
              marginBottom: 12, borderRadius: 12, overflow: "hidden",
              background: isExpanded ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
              border: isExpanded ? "1px solid rgba(201,168,76,0.25)" : "1px solid rgba(255,255,255,0.05)",
              transition: "all 0.3s",
            }}>
              {/* Month header bar */}
              <div
                onClick={() => toggleMonth(m.month)}
                style={{
                  padding: "16px 20px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 16,
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                  background: taskPct === 1 ? "#00b894" : "linear-gradient(135deg, #1a1a2e, #0f3460)",
                  border: taskPct === 1 ? "2px solid #00d2a0" : "2px solid #c9a84c",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: taskPct === 1 ? "#fff" : "#c9a84c",
                }}>
                  {taskPct === 1 ? "✓" : `M${m.month}`}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#e8e6e1" }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: "#6a6a7a", marginTop: 2 }}>{m.subtitle}</div>
                  {/* Dual progress bar */}
                  <div style={{ marginTop: 8 }}>
                    <DualProgressBar timePct={timePct} taskPct={taskPct} />
                  </div>
                </div>

                <div style={{
                  fontSize: 12, color: "#8a8a9a", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}>▼</div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: "0 20px 20px" }}>
                  {Object.entries(m.tracks).map(([track, items]) => {
                    const meta = TRACK_META[track];
                    return (
                      <div key={track} style={{
                        marginTop: 12, padding: 14, borderRadius: 8,
                        background: `${meta.color}08`, border: `1px solid ${meta.color}18`,
                      }}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: meta.color,
                          textTransform: "uppercase", letterSpacing: 1, marginBottom: 10,
                        }}>
                          {meta.icon} {meta.label}
                        </div>
                        {items.map((item, idx) => {
                          const key = `${m.month}-${track}-${idx}`;
                          const isDone = checked[key];
                          return (
                            <div
                              key={key}
                              onClick={() => toggle(key)}
                              style={{
                                display: "flex", alignItems: "flex-start", gap: 10,
                                padding: "8px 0", cursor: "pointer",
                                borderBottom: idx < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                              }}
                            >
                              <div style={{
                                width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                                background: isDone ? meta.color : "transparent",
                                border: isDone ? `2px solid ${meta.color}` : "2px solid rgba(255,255,255,0.15)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.2s",
                                fontSize: 12, color: "#fff",
                              }}>
                                {isDone && "✓"}
                              </div>
                              <div style={{
                                fontSize: 13, lineHeight: 1.5,
                                color: isDone ? "#6a6a7a" : "#d0cec8",
                                textDecoration: isDone ? "line-through" : "none",
                                transition: "all 0.2s",
                              }}>
                                {item}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Milestone */}
                  <div style={{
                    marginTop: 14, padding: "10px 14px", borderRadius: 6,
                    background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)",
                  }}>
                    <div style={{ fontSize: 10, color: "#c9a84c", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      🏁 End of Month {m.month}
                    </div>
                    <div style={{ fontSize: 12, color: "#a09880", marginTop: 4 }}>{m.milestone}</div>
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

function DualProgressBar({ timePct, taskPct }) {
  // The bar shows time in red and tasks completed in green overlay
  const timeW = Math.max(timePct * 100, 0);
  const taskW = Math.max(taskPct * 100, 0);
  const behind = timePct > 0 && taskPct < timePct;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: behind ? "#ff6b81" : "#6a6a7a" }}>
          {Math.round(taskPct * 100)}% done {behind ? `· ${Math.round(timePct * 100)}% time elapsed` : ""}
        </span>
      </div>
      <div style={{
        height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden",
        position: "relative",
      }}>
        {/* Time (red) layer */}
        <div style={{
          position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 3,
          width: `${timeW}%`, background: "#ff4757", opacity: 0.6, transition: "width 0.5s ease",
        }} />
        {/* Task (green) layer — overwrites red */}
        <div style={{
          position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 3,
          width: `${taskW}%`, background: "#00b894", transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

function ProgressBar({ label, timePct, taskPct, simple, greenOnly }) {
  const pct = greenOnly ? taskPct : timePct;
  const color = greenOnly ? "#00b894" : "#ff4757";
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: "#8a8a9a", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(pct * 100)}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3, width: `${pct * 100}%`,
          background: color, transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}
