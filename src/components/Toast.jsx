import React from "react";

export default function Toast({ toasts, onDismiss }) {
  return (
    <div className="toastWrap" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <div>
            <div>{t.title}</div>
            {t.detail ? <small>{t.detail}</small> : null}
          </div>
          <button className="btn" onClick={() => onDismiss(t.id)} aria-label="Dismiss notification">
            Close
          </button>
        </div>
      ))}
    </div>
  );
}
