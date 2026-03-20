export default function ConfirmModal({ isOpen, title, message, confirmLabel = "Confirm", confirmDanger = false, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#1a1a2e", border: `1px solid ${confirmDanger ? "rgba(255,71,87,0.3)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 14, padding: "32px", maxWidth: 380, width: "100%", textAlign: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>{confirmDanger ? "🗑" : "⚠️"}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#e8e6e1", marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#8a8a9a", marginBottom: 28, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 22px", borderRadius: 8, fontSize: 13, cursor: "pointer",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              color: "#e8e6e1", transition: "all 0.2s", fontFamily: "inherit",
            }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 22px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600,
              background: confirmDanger ? "rgba(255,71,87,0.15)" : "rgba(201,168,76,0.15)",
              border: `1px solid ${confirmDanger ? "rgba(255,71,87,0.4)" : "rgba(201,168,76,0.4)"}`,
              color: confirmDanger ? "#ff4757" : "#c9a84c",
              transition: "all 0.2s", fontFamily: "inherit",
            }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
