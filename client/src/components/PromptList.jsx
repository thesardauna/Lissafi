import { useEffect, useMemo, useState } from "react";

function parseCsvLine(line) {
  // Minimal CSV handling: supports commas inside quotes
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export default function PromptList() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Works on subfolder deploys (e.g., GitHub Pages)
        const url = `${import.meta.env.BASE_URL}Lissafi.csv`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load CSV: ${res.status}`);

        const text = await res.text();
        const rows = text.split(/\r?\n/).filter(Boolean);
        if (rows.length <= 1) throw new Error("CSV has no data rows.");

        const data = rows
          .slice(1)
          .map((line) => {
            const cols = parseCsvLine(line);
            const category = (cols[0] ?? "").trim();
            const title = (cols[1] ?? "").trim();
            const prompt = (cols.slice(2).join(",") ?? "").trim();
            if (!title || !prompt) return null;
            return { category: category || "Uncategorized", title, prompt };
          })
          .filter(Boolean);

        if (alive) setPrompts(data);
      } catch (e) {
        if (alive) setErr(e?.message || "Failed to load prompts.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(prompts.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [prompts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return prompts.filter((p) => {
      const matchCategory = category === "All" || p.category === category;
      if (!matchCategory) return false;

      if (!q) return true;

      const inTitle = p.title.toLowerCase().includes(q);
      const inPrompt = p.prompt.toLowerCase().includes(q);
      return inTitle || inPrompt;
    });
  }, [prompts, query, category]);

  const copyPrompt = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback: do nothing (older browsers)
    }
  };

  if (loading) return <p className="loading">Loading prompts…</p>;
  if (err) return <p className="loading">Error: {err}</p>;

  return (
    <>
      <div className="prompt-controls">
        <input
          className="prompt-search"
          type="search"
          placeholder="Search prompts (e.g., resume, logo, email)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search prompts"
        />

        <select
          className="prompt-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Select category"
        >
          {categories.map((c) => (
            <option value={c} key={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="prompt-meta">
        Showing <b>{filtered.length}</b> of <b>{prompts.length}</b> prompts
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          No prompts match your search. Try another keyword or choose “All”.
        </div>
      ) : (
        <div className="prompt-grid">
          {filtered.map((p, i) => (
            <div className="prompt-card" key={`${p.title}-${i}`}>
              <span className="prompt-category">{p.category}</span>
              <h3>{p.title}</h3>
              <p className="prompt-text">{p.prompt}</p>

              <button
                className="btn-secondary"
                type="button"
                onClick={() => copyPrompt(p.prompt)}
              >
                Copy Prompt
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
