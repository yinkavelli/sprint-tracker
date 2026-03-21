import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveSprint, getSprintById } from "../services/DataService";
import {
  generatePlan,
  generatePlanOutline,
  formatOutlineAsText,
  applyRevision,
  parseDocumentText,
  extractContextFromDoc,
  parseDuration,
  QUESTIONS,
} from "../ai/sprintBuilder";
import { sendChatMessage, isGPTAvailable } from "../services/aiService";

const GPT_MODE = isGPTAvailable();

// ─── AI avatar icon (premium gradient) ───────────────────────────────────

function AIAvatar({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#6c5ce7 0%,#a855f7 50%,#06b6d4 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.45, boxShadow: "0 0 10px rgba(108,92,231,0.45)",
      fontWeight: 700, color: "#fff", letterSpacing: -0.5,
    }}>✦</div>
  );
}

// ─── typing indicator ─────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "14px 16px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#a855f7", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-6px);opacity:1}}`}</style>
    </div>
  );
}

// ─── message bubble ──────────────────────────────────────────────────────

function MessageBubble({ msg, onApprovePlan, onSprintView }) {
  return (
    <div style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 12, alignItems: "flex-end" }}>
      {msg.role === "ai" && <AIAvatar size={32} />}
      <div style={{
        maxWidth: "78%", padding: "13px 16px",
        borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: msg.role === "user" ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${msg.role === "user" ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.08)"}`,
        fontSize: 13.5, lineHeight: 1.7, color: "#d8d6d0", whiteSpace: "pre-wrap",
      }}>
        {msg.type === "doc" && (
          <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6, color: "#c9a84c", fontSize: 11, fontWeight: 600 }}>
            📎 {msg.fileName}
          </div>
        )}
        {msg.text}

        {msg.type === "outline" && onApprovePlan && (
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onApprovePlan} style={{ background: "linear-gradient(135deg,#00b894,#00a381)", border: "none", color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              ✅ Build This Plan
            </button>
            <div style={{ fontSize: 12, color: "#6a6a7a", display: "flex", alignItems: "center" }}>or describe changes below ↓</div>
          </div>
        )}

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

// ─── main component ───────────────────────────────────────────────────────

// Phases:
// 'chat'     → GPT-4o (or scripted) conversation collecting info
// 'preview'  → outline shown, approve or revise
// 'building' → generating full plan
// 'done'     → plan saved, CTA shown

export default function NewSprintPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Modify-mode: navigated here with an existing sprint to update
  const modifySprintId = location.state?.modifySprintId || null;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [phase, setPhase] = useState("chat");
  const [context, setContext] = useState({});
  const [sprintId, setSprintId] = useState(modifySprintId);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [hovered, setHovered] = useState("");

  // GPT conversation memory (only used in GPT_MODE)
  const [convHistory, setConvHistory] = useState([]);

  // Scripted fallback state
  const [questionIndex, setQuestionIndex] = useState(0);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── helpers ───────────────────────────────────────────────────────────

  function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function addUserMsg(text, extra = {}) {
    setMessages((p) => [...p, { role: "user", text, ...extra }]);
  }
  function addAIMsg(text, extra = {}) {
    setMessages((p) => [...p, { role: "ai", text, ...extra }]);
  }

  // ── initial greeting ──────────────────────────────────────────────────

  useEffect(() => {
    const firstName = user?.name?.split(" ")[0] || "there";
    setTimeout(() => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        if (modifySprintId) {
          // Modify-mode: load existing sprint context
          const existing = getSprintById(modifySprintId);
          if (existing) {
            const ctx = {
              goal: existing.subtitle || existing.title,
              sprintTitle: existing.title,
              duration: `${existing.blockCount} ${existing.blockLabel}s`,
            };
            setContext(ctx);
            if (GPT_MODE) {
              const initMsg = { role: "user", content: `I want to modify my existing sprint plan. Here are the details:\n\nTitle: ${existing.title}\nGoal: ${existing.subtitle || existing.title}\nDuration: ${existing.blockCount} ${existing.blockLabel}s\nTracks: ${Object.values(existing.tracks || {}).map(t => t.label).join(', ')}\n\nI want to make some changes.` };
              setConvHistory([initMsg]);
            }
            addAIMsg(`Hey ${firstName}! 👋 I can see your sprint "${existing.title}".

What would you like to change or enhance? You can tell me to adjust the timeline, add new focus areas, change the milestones, or completely rethink the approach.`);
          } else {
            addAIMsg(`Hey ${firstName}! 👋 Couldn't find that sprint — let's start fresh.\n\nWhat's the goal you'd like to achieve?`);
          }
        } else if (GPT_MODE) {
          addAIMsg(`Hey ${firstName}! 👋 I'm your sprint planning assistant.\n\nWhat's the goal you're working toward? The more specific you are, the better I can tailor your plan.\n\n(You can also upload a document using the 📎 button below.)`);
        } else {
          addAIMsg(`Hey ${firstName}! 👋 I'll guide you through building your sprint plan.\n\n${QUESTIONS[0].ask}\n\n⚡ Running in rule-based mode. Add a VITE_OPENAI_API_KEY to your .env for GPT-4o.`);
        }
      }, 900);
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // ── document upload ───────────────────────────────────────────────────

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadError("");

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["txt", "md", "docx", "pdf"].includes(ext)) {
      setUploadError("Unsupported file. Please upload .txt, .md, .docx, or .pdf");
      return;
    }

    setUploading(true);
    addUserMsg(`📎 Uploaded: ${file.name}`, { type: "doc", fileName: file.name });

    try {
      const text = await parseDocumentText(file);
      const extracted = extractContextFromDoc(text);

      setUploading(false);
      setTyping(true);
      await delay(800);
      setTyping(false);

      const parts = [`📄 I've read "${file.name}" — here's what I found:`];
      if (extracted.goal) parts.push(`\nGoal: "${extracted.goal.slice(0, 120)}${extracted.goal.length > 120 ? "…" : ""}"`);
      if (extracted.duration) parts.push(`Duration: ${extracted.duration}`);
      if (extracted.sprintTitle) parts.push(`Project name: "${extracted.sprintTitle}"`);

      if (GPT_MODE) {
        // Feed the document content into the GPT conversation as context
        const docSummary = `The user uploaded a document. Extracted content: ${text.slice(0, 1200)}`;
        const newHistory = [
          ...convHistory,
          { role: "user", content: `I've uploaded a document with my goal details. Here's the content:\n\n${text.slice(0, 1200)}` },
        ];
        setConvHistory(newHistory);
        setContext((c) => ({ ...c, ...extracted }));

        parts.push("\n\nLet me ask a couple of follow-up questions to fill in the gaps.");
        addAIMsg(parts.join("\n"));

        setTyping(true);
        const { content } = await sendChatMessage(newHistory);
        setTyping(false);

        if (content) {
          setConvHistory([...newHistory, { role: "assistant", content }]);
          addAIMsg(content);
        }
      } else {
        // Scripted fallback — pre-fill context and skip answered questions
        let nextQ = questionIndex;
        if (extracted.goal && nextQ === 0) nextQ = 1;
        setQuestionIndex(nextQ);
        setContext((c) => ({ ...c, ...extracted }));
        parts.push(`\n\nLet me ask a few follow-up questions.\n\n${QUESTIONS[nextQ].ask}`);
        addAIMsg(parts.join("\n"));
      }
    } catch (err) {
      setUploading(false);
      setTyping(false);
      if (err.message === "UNSUPPORTED_FORMAT") {
        setUploadError("Unsupported file. Please upload .txt, .md, .docx, or .pdf");
      } else if (err.message === "PDF_PARSE_FAILED") {
        setUploadError("PDF parsing failed. Try a .docx or .txt file, or paste the key details into the chat.");
      } else {
        setUploadError(err.message || "Upload failed. Try a different file format.");
      }
    }
  }

  // ── send message ──────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim();
    if (!text || phase === "building" || phase === "done") return;
    setInput("");
    setUploadError("");
    addUserMsg(text);

    if (phase === "preview") {
      await handleRevision(text);
      return;
    }

    // 'chat' phase
    if (GPT_MODE) {
      await handleGPTReply(text);
    } else {
      await handleScriptedReply(text);
    }
  }

  // ── GPT conversation ──────────────────────────────────────────────────

  async function handleGPTReply(userText) {
    const newHistory = [...convHistory, { role: "user", content: userText }];
    setConvHistory(newHistory);
    setTyping(true);

    const { content, source } = await sendChatMessage(newHistory);
    setTyping(false);

    if (!content || source === "fallback") {
      addAIMsg("I'm having trouble connecting right now. Could you try again in a moment?");
      return;
    }

    // Check for the READY: signal anywhere in the response
    const readyLineMatch = content.split("\n").find((l) => l.trim().startsWith("READY:"));
    if (readyLineMatch) {
      try {
        const jsonStr = readyLineMatch.slice(readyLineMatch.indexOf("READY:") + "READY:".length).trim();
        const extracted = JSON.parse(jsonStr);
        setContext(extracted);
        setConvHistory([...newHistory, { role: "assistant", content }]);

        // Show any natural text GPT wrote before the READY: line
        const textBeforeReady = content.split("\n")
          .filter((l) => !l.trim().startsWith("READY:"))
          .join("\n").trim();
        if (textBeforeReady) addAIMsg(textBeforeReady);

        await delay(500);
        addAIMsg("Perfect — let me draft your plan outline…");
        await delay(900);
        await showPlanOutline(extracted);
        return;
      } catch {
        // JSON parse failed — fall through and treat as normal message
      }
    }

    setConvHistory([...newHistory, { role: "assistant", content }]);
    addAIMsg(content);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  // ── Scripted fallback ─────────────────────────────────────────────────

  async function handleScriptedReply(text) {
    const currentQ = QUESTIONS[questionIndex];
    const newCtx = { ...context, [currentQ.id]: text };
    setContext(newCtx);
    const nextIdx = questionIndex + 1;

    setTyping(true);
    await delay(600 + Math.random() * 400);
    setTyping(false);

    if (nextIdx < QUESTIONS.length) {
      setQuestionIndex(nextIdx);
      addAIMsg(QUESTIONS[nextIdx].ask);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      await showPlanOutline(newCtx);
    }
  }

  // ── Plan outline ──────────────────────────────────────────────────────

  async function showPlanOutline(ctx) {
    setTyping(true);
    await delay(1200);
    setTyping(false);
    const outline = generatePlanOutline(ctx);
    const outlineText = formatOutlineAsText(outline);
    addAIMsg(outlineText, { type: "outline" });
    setPhase("preview");
  }

  // ── Approve plan ──────────────────────────────────────────────────────

  async function handleApprovePlan() {
    setPhase("building");
    addAIMsg(GPT_MODE
      ? "✨ Sending to GPT-4o — building your personalised plan now…"
      : "✨ Building your plan now…"
    );
    setTyping(true);

    try {
      const sprint = await generatePlan({ ...context, userId: user.id });
      setTyping(false);
      saveSprint(sprint);
      setSprintId(sprint.id);
      setPhase("done");
      const dur = parseDuration(context.duration);
      addAIMsg(
        `🎉 Your plan is live! ${sprint.aiGenerated ? "🤖 AI-generated" : "⚡ Rule-based"}\n\n"${sprint.title}" — ${dur.count}-${dur.label.toLowerCase()} plan, 3 tracks, ${sprint.periods.length * 9} personalised tasks. Let's go! 🚀`,
        { type: "done" }
      );
    } catch {
      setTyping(false);
      setPhase("preview");
      addAIMsg("⚠️ Something went wrong building the plan. Try again or check your API key.");
    }
  }

  // ── Revision ──────────────────────────────────────────────────────────

  async function handleRevision(text) {
    setPhase("chat");
    setTyping(true);
    addAIMsg("Got it — revising your plan outline…");
    await delay(1000);
    const updated = applyRevision(context, text);
    setContext(updated);
    setTyping(false);
    const outline = generatePlanOutline(updated);
    const outlineText = formatOutlineAsText(outline);
    addAIMsg(`Updated based on your feedback:\n\n${outlineText}`, { type: "outline" });
    setPhase("preview");
  }

  // ── Keyboard ──────────────────────────────────────────────────────────

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Render ────────────────────────────────────────────────────────────

  const inputDisabled = phase === "building" || phase === "done";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", flexDirection: "column", fontFamily: "'DM Sans',sans-serif", color: "#e8e6e1" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
        textarea:focus{outline:none}
        @media(max-width:600px){
          .chat-header-inner{padding:10px 12px !important;flex-wrap:nowrap !important;}
          .chat-back-btn{padding:5px 10px !important;font-size:11px !important;}
          .chat-title{font-size:14px !important;}
          .mode-badge{display:none !important;}
          .chat-messages-wrap{padding:14px 0 !important;}
          .chat-messages-inner{padding:0 10px !important;gap:11px !important;}
          .chat-bubble{max-width:90% !important;padding:10px 12px !important;font-size:13px !important;}
          .chat-input-bar{padding:10px 12px !important;gap:7px !important;}
          .chat-input-hint{padding:4px 10px 0 !important;}
        }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", borderBottom: "2px solid #c9a84c", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }} className="chat-header-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate("/dashboard")} onMouseEnter={() => setHovered("b")} onMouseLeave={() => setHovered("")} className="chat-back-btn" style={{ background: hovered === "b" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#8a8a9a", padding: "7px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>← Back</button>
          <div>
            <div className="chat-title" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "#c9a84c", display: "flex", alignItems: "center", gap: 8 }}>
              {modifySprintId ? "Modify Sprint" : "New Sprint"}
              <span className="mode-badge" style={{
                fontSize: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
                padding: "2px 9px", borderRadius: 20,
                background: GPT_MODE ? "rgba(0,184,148,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${GPT_MODE ? "rgba(0,184,148,0.4)" : "rgba(255,255,255,0.1)"}`,
                color: GPT_MODE ? "#00b894" : "#6a6a7a",
              }}>
                {GPT_MODE ? "✦ GPT-4o" : "⚡ Rule-based"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#6a6a7a" }}>
              {phase === "chat" ? (GPT_MODE ? "AI conversation" : "Guided setup") : phase === "preview" ? "Review your plan" : phase === "building" ? "Generating…" : "Plan ready!"}
            </div>
          </div>
        </div>
        {/* Status dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: phase === "done" ? "#00b894" : phase === "building" ? "#fdcb6e" : phase === "preview" ? "#c9a84c" : GPT_MODE ? "#a855f7" : "#6a6a7a", boxShadow: `0 0 6px ${phase === "building" ? "#fdcb6e" : GPT_MODE ? "#a855f7" : "#6a6a7a"}`, transition: "all 0.3s" }} />
          <span style={{ fontSize: 10, color: "#6a6a7a" }}>{phase === "done" ? "Complete" : phase === "building" ? "Building…" : phase === "preview" ? "Review" : "Chatting"}</span>
        </div>
      </div>

      {/* Chat messages */}
      <div className="chat-messages-wrap" style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        <div className="chat-messages-inner" style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 16 }}>
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
              <AIAvatar size={32} />
              <div style={{ padding: "4px 8px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      {!inputDisabled && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 20px", background: "#0d0d14" }}>
          {uploadError && (
            <div style={{ maxWidth: 700, margin: "0 auto 8px", padding: "8px 12px", borderRadius: 7, background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.25)", color: "#ff4757", fontSize: 12 }}>
              {uploadError}
            </div>
          )}
          {phase === "preview" && (
            <div style={{ maxWidth: 700, margin: "0 auto 10px", fontSize: 12, color: "#5a5a6a" }}>
              ✏️ Type any changes (e.g. "make it 8 weeks", "rename it to X") — or tap <strong style={{ color: "#00b894" }}>✅ Build This Plan</strong> above.
            </div>
          )}
        <div className="chat-input-bar" style={{ maxWidth: 700, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Upload goal doc (.txt, .docx, .pdf)" style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#6a6a7a", fontSize: 18, cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {uploading ? "⏳" : "📎"}
            </button>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.docx,.pdf" style={{ display: "none" }} onChange={handleFileUpload} />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={phase === "preview" ? "Describe any changes, or click ✅ Build above…" : GPT_MODE ? "Chat with GPT-4o…" : QUESTIONS[Math.min(questionIndex, QUESTIONS.length - 1)]?.placeholder}
              rows={1}
              style={{ flex: 1, resize: "none", borderRadius: 12, padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#e8e6e1", fontSize: 14, lineHeight: 1.5, fontFamily: "inherit", maxHeight: 140, overflow: "auto" }}
              onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`; }}
            />
            <button onClick={handleSend} disabled={!input.trim()} style={{ width: 44, height: 44, borderRadius: "50%", border: "none", cursor: input.trim() ? "pointer" : "not-allowed", background: input.trim() ? "linear-gradient(135deg,#c9a84c,#a8863e)" : "rgba(255,255,255,0.06)", color: input.trim() ? "#0a0a0f" : "#4a4a5a", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>
              ↑
            </button>
          </div>
          <div style={{ maxWidth: 700, margin: "6px auto 0", fontSize: 11, color: "#3a3a4a", paddingLeft: 4 }}>
            Enter to send · Shift+Enter for new line · 📎 upload a doc
          </div>
        </div>
      )}
    </div>
  );
}
