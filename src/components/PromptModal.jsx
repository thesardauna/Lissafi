import React, { useMemo, useState } from "react";

export default function PromptModal({ prompt, onClose, onCopy, onCopyWithVars }) {
  const [varsText, setVarsText] = useState("");

  const tags = useMemo(() => (prompt.tags ?? []).filter(Boolean), [prompt.tags]);

  return (
    <div className="modalBackdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2>{prompt.title}</h2>
            <div className="metaLine">
              <span className="pill">{prompt.category || "Uncategorized"}</span>
              {tags.length ? <span className="pill">Tags: {tags.join(", ")}</span> : null}
            </div>
          </div>
          <div className="btnRow">
            <button className="btn btnDanger" onClick={onClose}>
              Back
            </button>
          </div>
        </div>

        <div className="modalBody">
          {prompt.use_case ? (
            <div className="metaLine">
              <strong style={{ color: "rgba(233,238,255,0.92)" }}>Use case:</strong> {prompt.use_case}
            </div>
          ) : null}

          {prompt.notes ? (
            <div className="metaLine">
              <strong style={{ color: "rgba(233,238,255,0.92)" }}>Notes:</strong> {prompt.notes}
            </div>
          ) : null}

          <div className="codePanel">{prompt.prompt || "(No prompt text found in CSV.)"}</div>

          <div className="btnRow">
            <button className="btn btnPrimary" onClick={() => onCopy(prompt.prompt || "")}>
              Copy Prompt
            </button>

            <button className="btn" onClick={() => onCopyWithVars(prompt.prompt || "")} title="Auto-detect {variables}">
              Copy With Variables (optional)
            </button>
          </div>

          <div style={{ borderTop: "1px solid rgba(120,160,255,0.18)", paddingTop: 10 }}>
            <div className="metaLine">
              <span className="pill">Tip</span>
              If the prompt uses placeholders like <span className="kbd">{`{topic}`}</span>, “Copy With Variables” will ask you to fill them.
            </div>
            <input
              className="search"
              value={varsText}
              onChange={(e) => setVarsText(e.target.value)}
              placeholder="Optional: paste variable hints or your filled values here, for your own notes..."
              aria-label="Variable notes"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
