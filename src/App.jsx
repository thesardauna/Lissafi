import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadPromptsFromCSV } from "./utils/csv";
import { rankAndFilterPrompts } from "./utils/search";
import { bumpUsage, readUsage } from "./utils/storage";

import CategoryChips from "./components/CategoryChips";
import PromptCard from "./components/PromptCard";
import PromptModal from "./components/PromptModal";
import Toast from "./components/Toast";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prompts, setPrompts] = useState([]);

  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortMode, setSortMode] = useState("az"); // az | latest | used

  const [activePrompt, setActivePrompt] = useState(null);
  const [toasts, setToasts] = useState([]);

  const usageRef = useRef(readUsage());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await loadPromptsFromCSV();
        if (!mounted) return;
        setPrompts(data);
        setError("");
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load prompts.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Hash-based deep link: #/prompt/<id>
  useEffect(() => {
    function onHashChange() {
      const id = getPromptIdFromHash(window.location.hash);
      if (!id) return;
      const found = prompts.find((p) => p.id === id);
      if (found) setActivePrompt(found);
    }
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [prompts]);

  const categories = useMemo(() => {
    const map = new Map();
    for (const p of prompts) {
      const c = (p.category || "Uncategorized").trim() || "Uncategorized";
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [prompts]);

  const filtered = useMemo(() => {
    const base = rankAndFilterPrompts(
      prompts,
      query,
      selectedCategories
    );

    // Sorting layer
    if (sortMode === "az") {
      return [...base].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortMode === "used") {
      const usage = usageRef.current;
      return [...base].sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0) || a.title.localeCompare(b.title));
    }
    if (sortMode === "latest") {
      // If CSV lacks date, fallback to row order (assumes lower row index is “older”)
      return [...base].sort((a, b) => {
        const da = parseDate(a.date);
        const db = parseDate(b.date);
        if (da && db) return db - da;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return (b._row ?? 0) - (a._row ?? 0);
      });
    }
    return base;
  }, [prompts, query, selectedCategories, sortMode]);

  function toggleCategory(c) {
    setSelectedCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function clearCategories() {
    setSelectedCategories([]);
  }

  function openPrompt(p) {
    setActivePrompt(p);
    window.location.hash = `#/prompt/${p.id}`;
    bumpUsage(p.id);
    usageRef.current = readUsage();
  }

  function closePrompt() {
    setActivePrompt(null);
    if (window.location.hash.startsWith("#/prompt/")) {
      window.location.hash = "#/";
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      pushToast("Copied", "Prompt copied to clipboard.");
    } catch {
      // Fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        pushToast("Copied", "Prompt copied to clipboard.");
      } catch {
        pushToast("Copy failed", "Your browser blocked clipboard access.");
      }
    }
  }

  async function copyWithVariables(promptText) {
    const vars = Array.from(promptText.matchAll(/\{([a-zA-Z0-9_ -]+)\}/g)).map((m) => m[1]).filter(Boolean);
    const unique = Array.from(new Set(vars));

    if (unique.length === 0) {
      await copyText(promptText);
      return;
    }

    const filled = { ...Object.fromEntries(unique.map((v) => [v, ""])) };

    for (const v of unique) {
      const val = window.prompt(`Fill variable: {${v}}`, "");
      if (val === null) {
        pushToast("Canceled", "Variable fill canceled.");
        return;
      }
      filled[v] = val;
    }

    let out = promptText;
    for (const [k, v] of Object.entries(filled)) {
      out = out.replaceAll(`{${k}}`, v);
    }

    await copyText(out);
  }

  function pushToast(title, detail) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, title, detail }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }

  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const totalCount = prompts.length;
  const shownCount = filtered.length;
  const usageCounts = usageRef.current;

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="logo">Lissafi</div>
          <div className="title">Prompt Library</div>
        </div>
        <div className="badge">{totalCount} prompts</div>
      </div>

      <div className="hero">
        <h1>Browse, search, and copy prompts at lightspeed.</h1>
        <p>
          Lissafi is a curated library of AI prompts, loaded directly from <span className="kbd">Lissafi.csv</span>.
          Search by title, tags, or category, then open a prompt and copy it instantly.
        </p>

        <div className="controls">
          <div className="searchRow">
            <input
              className="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prompts (title, tags, category, use case)..."
              aria-label="Search prompts"
            />
            <select className="select" value={sortMode} onChange={(e) => setSortMode(e.target.value)} aria-label="Sort prompts">
              <option value="latest">Latest (date if present)</option>
              <option value="az">A–Z</option>
              <option value="used">Most Used (local)</option>
            </select>
          </div>

          <div className="smallRow">
            <span>
              Showing <strong>{shownCount}</strong> of <strong>{totalCount}</strong>
            </span>
            <span>Tip: share a prompt link via hash, for example: <span className="kbd">#/prompt/&lt;id&gt;</span></span>
          </div>

          <CategoryChips
            categories={categories.map((c) => `${c.name} (${c.count})`)}
            selected={selectedCategories.map((c) => `${c} (${categories.find((x) => x.name === c)?.count ?? 0})`)}
            onToggle={(label) => {
              const name = label.replace(/\s*\(\d+\)\s*$/, "");
              toggleCategory(name);
            }}
            onClear={clearCategories}
          />
        </div>
      </div>

      {loading ? (
        <div className="badge">Loading prompts from CSV…</div>
      ) : error ? (
        <div className="badge" style={{ borderColor: "rgba(251,113,133,0.35)", color: "rgba(233,238,255,0.9)" }}>
          {error}
        </div>
      ) : shownCount === 0 ? (
        <div className="badge">No prompts match your search and filters.</div>
      ) : (
        <div className="grid">
          {filtered.map((p) => (
            <PromptCard key={p.id} prompt={p} usageCount={usageCounts[p.id] ?? 0} onOpen={openPrompt} />
          ))}
        </div>
      )}

      <div className="footer">
        <span>Offline-friendly static site. CSV is the source of truth.</span>
        <span>
          Update prompts by editing <span className="kbd">public/Lissafi.csv</span>.
        </span>
      </div>

      {activePrompt ? (
        <PromptModal
          prompt={activePrompt}
          onClose={closePrompt}
          onCopy={(t) => copyText(t)}
          onCopyWithVars={(t) => copyWithVariables(t)}
        />
      ) : null}

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function getPromptIdFromHash(hash) {
  const h = (hash || "").trim();
  const m = h.match(/^#\/prompt\/([a-z0-9-]+)$/i);
  return m ? m[1] : "";
}

function parseDate(s) {
  const t = (s ?? "").toString().trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}
