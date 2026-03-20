import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveSprint } from "../services/DataService";
import { QUESTIONS, generatePlan } from "../ai/sprintBuilder";

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "14px 16px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#c9a84c",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function NewSprintPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [context, setContext] = useState({});
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [hovered, setHovered] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Send first AI message on mount
  useEffect(() => {
    setTimeout(() => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages([{ role: "ai", text: `Hi ${user.name.split(" ")[0]}! 👋 I'm going to help you build a personalised 6-month sprint plan.\n\n${QUESTIONS[0].ask}` }]);
      }, 1000);
    }, 300);
  }, [user.name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function handleSend() {
    const text = input.trim();
    if (!text || done) return;
    setInput("");

    const currentQ = QUESTIONS[questionIndex];
    const newContext = { ...context, [currentQ.id]: text };
    setContext(newContext);

    // Append user message
    setMessages((prev) => [...prev, { role: "user", text }]);

    const nextIndex = questionIndex + 1;

    if (nextIndex < QUESTIONS.length) {
      // Ask next question
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        const ack = getAck(questionIndex, text);
        setMessages((prev) => [...prev, { role: "ai", text: `${ack}\n\n${QUESTIONS[nextIndex].ask}` }]);
        setQuestionIndex(nextIndex);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 900 + Math.random() * 600);
    } else {
      // All questions answered — generate plan
      setDone(true);
      setTyping(true);
      setMessages((prev) => [...prev, { role: "ai", text: "✨ Perfect — that's everything I need! Let me build your personalised 6-month sprint plan now…", loading: true }]);

      await new Promise((r) => setTimeout(r, 2000));

      const sprint = generatePlan({ ...newContext, userId: user.id });
      saveSprint(sprint);

      setTyping(false);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "ai",
          text: `🎉 Your sprint plan is ready!\n\nI've built **"${sprint.title}"** — a 6-month roadmap across 3 tracks with 54 personalised tasks tailored to your goal.\n\nLet's go! 🚀`,
          sprintId: sprint.id,
        },
      ]);
    }
  }

  function getAck(qIndex, answer) {
    const acks = [
      "Great goal! I can already see a clear path forward.",
      "Got it — that context will help me calibrate the difficulty of your plan.",
      `${answer.split(" ").slice(0, 3).join(" ")}… perfect. That's a realistic commitment I can work with.`,
      "Those milestones are clear and measurable — exactly what we need.",
      "Noted — I'll factor those constraints into your monthly plan.",
    ];
    return acks[qIndex] || "Got it.";
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

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

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", borderBottom: "2px solid #c9a84c", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => navigate("/dashboard")}
            onMouseEnter={() => setHovered("back")}
            onMouseLeave={() => setHovered("")}
            style={{
              background: hovered === "back" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)", color: "#8a8a9a", padding: "7px 14px",
              borderRadius: 7, fontSize: 12, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
            }}>
            ← Back
          </button>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "#c9a84c" }}>New Sprint</div>
            <div style={{ fontSize: 11, color: "#6a6a7a" }}>AI-guided setup</div>
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{
              width: i < questionIndex || done ? 8 : i === questionIndex ? 10 : 6,
              height: i < questionIndex || done ? 8 : i === questionIndex ? 10 : 6,
              borderRadius: "50%",
              background: i < questionIndex || done ? "#00b894" : i === questionIndex ? "#c9a84c" : "rgba(255,255,255,0.15)",
              transition: "all 0.3s",
            }} />
          ))}
          <div style={{ fontSize: 10, color: "#6a6a7a", marginLeft: 4 }}>
            {done ? "Complete" : `${questionIndex + 1} / ${QUESTIONS.length}`}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 12, alignItems: "flex-end" }}>
              {msg.role === "ai" && (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #c9a84c, #a8863e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                  🤖
                </div>
              )}
              <div style={{
                maxWidth: "78%", padding: "13px 16px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.role === "user" ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${msg.role === "user" ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.08)"}`,
                fontSize: 14, lineHeight: 1.6, color: "#d8d6d0", whiteSpace: "pre-wrap",
              }}>
                {msg.text}
                {msg.sprintId && (
                  <div style={{ marginTop: 14 }}>
                    <button
                      onClick={() => navigate(`/sprint/${msg.sprintId}`)}
                      style={{
                        background: "linear-gradient(135deg,#c9a84c,#a8863e)", border: "none",
                        color: "#0a0a0f", padding: "10px 22px", borderRadius: 8, fontSize: 13,
                        fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      }}>
                      View My Sprint Plan →
                    </button>
                  </div>
                )}
              </div>
            </div>
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

      {/* Input area */}
      {!done && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px", background: "#0d0d14" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={currentQ?.placeholder || "Type your answer…"}
              rows={1}
              style={{
                flex: 1, resize: "none", borderRadius: 12, padding: "12px 16px",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                color: "#e8e6e1", fontSize: 14, lineHeight: 1.5, fontFamily: "inherit",
                maxHeight: 140, overflow: "auto", transition: "border-color 0.2s",
              }}
              onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`; }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                width: 44, height: 44, borderRadius: "50%", border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
                background: input.trim() ? "linear-gradient(135deg,#c9a84c,#a8863e)" : "rgba(255,255,255,0.06)",
                color: input.trim() ? "#0a0a0f" : "#4a4a5a", fontSize: 18, display: "flex",
                alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0,
              }}>
              ↑
            </button>
          </div>
          <div style={{ maxWidth: 680, margin: "6px auto 0", fontSize: 11, color: "#3a3a4a", paddingLeft: 4 }}>
            Press Enter to send · Shift+Enter for new line
          </div>
        </div>
      )}
    </div>
  );
}
