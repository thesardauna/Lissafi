import React from "react";

export default function CategoryChips({ categories, selected, onToggle, onClear }) {
  return (
    <div className="chips" aria-label="Category filters">
      <span className={`chip ${selected.length === 0 ? "active" : ""}`} onClick={onClear} role="button" tabIndex={0}>
        All
      </span>
      {categories.map((c) => {
        const active = selected.includes(c);
        return (
          <span
            key={c}
            className={`chip ${active ? "active" : ""}`}
            onClick={() => onToggle(c)}
            role="button"
            tabIndex={0}
            title={`Filter by ${c}`}
          >
            {c}
          </span>
        );
      })}
    </div>
  );
}
