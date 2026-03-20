import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveSprint } from "../services/DataService";
import {
  QUESTIONS,
  generatePlan,
  generatePlanOutline,
  formatOutlineAsText,
  applyRevision,
  parseDocumentText,
  extractContextFromDoc,
  parseDuration,
} from "../ai/sprintBuilder";

// ─── typing indicator ────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "14px 16px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#c9a84c", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-6px);opacity:1} }`}</style>
    </div>
  );
}

// ─── message bubble ──────────────────────────────────────────────────────

function MessageBubble({ msg, onApprovePlan, onSprintView }) {
  return (
    <div style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 12, alignItems: "flex-end" }}>
      {msg.role === "ai" && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#c9a84c,#a8863e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
      )}
      <div style={{
        maxWidth: "78%", padding: "13px 16px",
        borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: msg.role === "user" ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${msg.role === "user" ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.08)"}`,
        fontSize: 13, lineHeight: 1.65, color: "#d8d6d0", whiteSpace: "pre-wrap",
      }}>
        {/* Uploaded doc notice */}
        {msg.type === "doc" && (
          <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6, color: "#c9a84c", fontSize: 11, fontWeight: 600 }}>
            📎 {msg.fileName}
          </div>
        )}
        {msg.text}

        {/* Plan outline action buttons */}
        {msg.type === "outline" && onApprovePlan && (
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onApprovePlan} style={{ background: "linear-gradient(135deg,#00b894,#00a381)", border: "none", color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              ✅ Build This Plan
            </button>
            <div style={{ fontSize: 12, color: "#6a6a7a", display: "flex", alignItems: "center" }}>or type revisions below ↓</div>
          </div>
        )}

        {/* Sprint ready CTA */}
        {msg.type === "done" && onSprintView && (
          <div style={{ marginTop: 14 }}>
            <button onClick={onSprintView} style={{ background: "linear-gradient(135deg,#c9a84c,#a8863e)", border: "none", color: "#0a0a0f", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              View My Sprint Plan →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────

// Chat phases:
// 'asking'   → working through QUESTIONS
// 'preview'  → outline shown, waiting for approve / revise
// 'revising' → processing revision text, regenerating outline
// 'building' → generating full plan JSON
// 'done'     → sprint saved, CTA shown

export default function NewSprintPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [context, setContext] = useState({});
  const [typing, setTyping] = useState(false);
  const [phase, setPhase] = useState("asking"); // asking | preview | revising | building | done
  const [sprintId, setSprintId] = useState(null);
  const [hovered, setHovered] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Send first AI message on mount
  useEffect(() => {
    setTimeout(() => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        addAIMessage(`Hi ${user.name.split(" ")[0]}! 👋 I'm going to help you build a personalised sprint plan — however long and whatever goal you choose.\n\n${QUESTIONS[0].ask}`);
      }, 900);
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // ── message helpers ─────────────────────────────────────────────────────

  function addUserMessage(text, extra = {}) {
    setMessages((prev) => [...prev, { role: "user", text, ...extra }]);
  }

  function addAIMessage(text, extra = {}) {
    setMessages((prev) => [...prev, { role: "ai", text, ...extra }]);
  }

  // ── file upload ─────────────────────────────────────────────────────────

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadError("");
    setUploading(true);

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["txt", "md", "docx", "pdf"].includes(ext)) {
      setUploadError("Unsupported file type. Please upload .txt, .md, .docx, or .pdf");
      setUploading(false);
      return;
    }

    addUserMessage(`📎 Uploaded: ${file.name}`, { type: "doc", fileName: file.name });

    try {
      const text = await parseDocumentText(file);
      const extracted = extractContextFromDoc(text);
      const newContext = { ...context, ...extracted };
      setContext(newContext);
      setUploading(false);

      setTyping(true);
      await delay(900);
      setTyping(false);

      // Build acknowledgement message
      const parts = [`📄 Got it — I've read your document "${file.name}".`];
      if (extracted.goal) parts.push(`\nI found your goal: "${extracted.goal.slice(0, 120)}${extracted.goal.length > 120 ? "…" : ""}"`);
      if (extracted.duration) parts.push(`Duration mentioned: ${extracted.duration}`);
      if (extracted.sprintTitle) parts.push(`Sprint name detected: "${extracted.sprintTitle}"`);

      // Skip to the next unanswered question based on what was extracted
      let nextQ = questionIndex;
      if (extracted.goal && nextQ === 0) nextQ = 1;

      setQuestionIndex(nextQ);
      addAIMessage(parts.join("\n") + `\n\nLet me ask a couple of follow-up questions to fill in the gaps.\n\n${QUESTIONS[nextQ].ask}`);
    } catch (err) {
      setUploading(false);
      const msg = err.message === "UNSUPPORTED_FORMAT"
        ? "I couldn't read that file format. Please try .txt, .docx, or .pdf."
        : "Something went wrong reading your document. You can describe your goal in the chat instead.";
      setUploadError(msg);
      setTyping(false);
    }
  }

  // ── send a message ──────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim();
    if (!text || phase === "building" || phase === "done") return;
    setInput("");
    setUploadError("");
    addUserMessage(text);

    if (phase === "asking") {
      await handleQuestionResponse(text);
    } else if (phase === "preview") {
      // User typed instead of clicking button — treat as revision
      await handleRevision(text);
    }
  }

  async function handleQuestionResponse(text) {
    const currentQ = QUESTIONS[questionIndex];
    const newContext = { ...context, [currentQ.id]: text };
    setContext(newContext);
    const nextIndex = questionIndex + 1;

    if (nextIndex < QUESTIONS.length) {
      setTyping(true);
      await delay(700 + Math.random() * 500);
      setTyping(false);
      const ack = getAck(questionIndex, text, newContext);
      addAIMessage(`${ack}\n\n${QUESTIONS[nextIndex].ask}`);
      setQuestionIndex(nextIndex);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // All questions answered — generate and show outline
      await showPlanOutline(newContext);
    }
  }

  async function showPlanOutline(ctx) {
    setTyping(true);
    addAIMessage("Perfect — let me put together your plan outline…");
    await delay(1400);
    setTyping(false);

    const outline = generatePlanOutline(ctx);
    const outlineText = formatOutlineAsText(outline);
    addAIMessage(outlineText, { type: "outline" });
    setPhase("preview");
  }

  // Approve plan — generate full JSON and navigate
  async function handleApprovePlan() {
    setPhase("building");
    setTyping(true);
    addAIMessage("✨ Building your full sprint plan now — this'll just take a second…");
    await delay(1800);
    setTyping(false);

    const sprint = generatePlan({ ...context, userId: user.id });
    saveSprint(sprint);
    setSprintId(sprint.id);
    setPhase("done");
    const dur = parseDuration(context.duration);
    addAIMessage(
      `🎉 Your sprint plan is live!\n\n"${sprint.title}" is a ${dur.count}-${dur.label.toLowerCase()} roadmap across 3 tracks with ${sprint.periods.length * 9} personalised tasks.\n\nLet's go! 🚀`,
      { type: "done" }
    );
  }

  // Handle revision
  async function handleRevision(revisionText) {
    setPhase("revising");
    setTyping(true);
    addAIMessage("Got it — revising your plan outline…");
    await delay(1300);

    const updatedContext = applyRevision(context, revisionText);
    setContext(updatedContext);
    setTyping(false);

    const outline = generatePlanOutline(updatedContext);
    const outlineText = formatOutlineAsText(outline);
    addAIMessage(`I've updated your plan based on your feedback:\n\n${outlineText}`, { type: "outline" });
    setPhase("preview");
  }

  // ── keyboard ───────────────────────────────────────────────────────────

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── helpers ────────────────────────────────────────────────────────────

  function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function getAck(qIndex, answer, ctx) {
    const acks = [
      "Great goal! I can already see a clear direction for your plan.",
      "Good context — that helps me calibrate the difficulty and depth of each block.",
      (() => {
        try { const d = parseDuration(answer); return `${d.count} ${d.label.toLowerCase()}${d.count !== 1 ? "s" : ""} — perfect. I'll structure your plan in ${d.label.toLowerCase()} blocks.`; }
        catch { return "Noted — I'll structure your plan accordingly."; }
      })(),
      `${answer.split(" ").slice(0, 4).join(" ")}… noted. I'll keep the pace realistic.`,
      "Those milestones are clear and measurable — exactly what I need to build your plan around.",
      "Noted — I'll factor those constraints into the plan.",
    ];
    const fn = acks[qIndex];
    return typeof fn === "function" ? fn() : (fn || "Got it.");
  }

  // ── progress dots ──────────────────────────────────────────────────────

  const isDone = phase === "done";
  const isPreviewOrLater = ["preview", "revising", "building", "done"].includes(phase);
  const inputDisabled = phase === "building" || phase === "done";
  const currentQ = QUESTIONS[Math.min(questionIndex, QUESTIONS.length - 1)];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif", color: "#e8e6e1" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        textarea:focus { outline: none; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", borderBottom: "2px solid #c9a84c", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate("/dashboard")} onMouseEnter={() => setHovered("back")} onMouseLeave={() => setHovered("")} style={{ background: hovered === "back" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#8a8a9a", padding: "7px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>← Back</button>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "#c9a84c" }}>New Sprint</div>
            <div style={{ fontSize: 11, color: "#6a6a7a" }}>
              {phase === "asking" ? "AI-guided setup" : phase === "preview" ? "Review your plan" : phase === "building" ? "Building plan…" : "Plan ready!"}
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Question dots */}
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{ width: i < questionIndex || isPreviewOrLater ? 8 : i === questionIndex ? 10 : 6, height: i < questionIndex || isPreviewOrLater ? 8 : i === questionIndex ? 10 : 6, borderRadius: "50%", background: i < questionIndex || isPreviewOrLater ? "#00b894" : i === questionIndex ? "#c9a84c" : "rgba(255,255,255,0.15)", transition: "all 0.3s" }} />
          ))}
          {/* Preview dot */}
          <div style={{ width: isPreviewOrLater ? (isDone ? 8 : 10) : 6, height: isPreviewOrLater ? (isDone ? 8 : 10) : 6, borderRadius: "50%", background: isDone ? "#00b894" : isPreviewOrLater ? "#c9a84c" : "rgba(255,255,255,0.1)", transition: "all 0.3s", marginLeft: 2 }} />
          <div style={{ fontSize: 10, color: "#6a6a7a", marginLeft: 4 }}>
            {isDone ? "Done" : isPreviewOrLater ? "Review" : `${questionIndex + 1}/${QUESTIONS.length}`}
          </div>
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              onApprovePlan={msg.type === "outline" && phase === "preview" ? handleApprovePlan : null}
              onSprintView={msg.type === "done" && sprintId ? () => navigate(`/sprint/${sprintId}`) : null}
            />
          ))}

          {typing && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#c9a84c,#a8863e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
              <div style={{ padding: "4px 8px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input area ── */}
      {!inputDisabled && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 20px", background: "#0d0d14" }}>
          {uploadError && (
            <div style={{ maxWidth: 700, margin: "0 auto 8px", padding: "8px 12px", borderRadius: 7, background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.25)", color: "#ff4757", fontSize: 12 }}>
              {uploadError}
            </div>
          )}

          {/* Phase hint for preview */}
          {phase === "preview" && (
            <div style={{ maxWidth: 700, margin: "0 auto 10px", fontSize: 12, color: "#5a5a6a" }}>
              ✏️ Type any revisions here (e.g. "rename it to X", "make it 8 weeks") — or tap <strong style={{ color: "#00b894" }}>✅ Build This Plan</strong> above to confirm.
            </div>
          )}

          <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
            {/* Upload button */}
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Upload a document with your goals (.txt, .docx, .pdf)" style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: uploading ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)", color: "#6a6a7a", fontSize: 18, cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
              {uploading ? "⏳" : "📎"}
            </button>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.docx,.pdf" style={{ display: "none" }} onChange={handleFileUpload} />

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={phase === "preview" ? "Describe any changes you want, or just click ✅ Build above…" : currentQ?.placeholder}
              rows={1}
              style={{ flex: 1, resize: "none", borderRadius: 12, padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#e8e6e1", fontSize: 14, lineHeight: 1.5, fontFamily: "inherit", maxHeight: 140, overflow: "auto", transition: "border-color 0.2s" }}
              onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`; }}
            />

            {/* Send button */}
            <button onClick={handleSend} disabled={!input.trim()} style={{ width: 44, height: 44, borderRadius: "50%", border: "none", cursor: input.trim() ? "pointer" : "not-allowed", background: input.trim() ? "linear-gradient(135deg,#c9a84c,#a8863e)" : "rgba(255,255,255,0.06)", color: input.trim() ? "#0a0a0f" : "#4a4a5a", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>
              ↑
            </button>
          </div>
          <div style={{ maxWidth: 700, margin: "6px auto 0", fontSize: 11, color: "#3a3a4a", paddingLeft: 4 }}>
            Press Enter to send · Shift+Enter for new line · 📎 to upload a doc
          </div>
        </div>
      )}
    </div>
  );
}
