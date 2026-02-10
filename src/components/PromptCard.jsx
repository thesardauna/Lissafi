import React from "react";

export default function PromptCard({ prompt, usageCount = 0, onOpen }) {
  const preview = (prompt.use_case || "").trim() || "Open to view details and copy the prompt.";
  return (
    <div className="card" onClick={() => onOpen(prompt)} role="button" tabIndex={0}>
      <div className="meta">
        <span className="pill">{prompt.category || "Uncategorized"}</span>
        <span className="pill" title="Local usage count">
          Used: {usageCount}
        </span>
      </div>
      <h3>{prompt.title}</h3>
      <p>{clamp(preview, 120)}</p>
    </div>
  );
}

function clamp(s, n) {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
