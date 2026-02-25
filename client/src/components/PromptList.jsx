import { useEffect, useMemo, useState } from "react";

function parseCsvLine(line) {
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
  return out.map((v) => v.replace(/^"+|"+$/g, "").trim());
}

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

function looksLikeHeader(row) {
  const joined = row.map(norm).join("|");
  return (
    joined.includes("category") ||
    joined.includes("subcategory") ||
    joined.includes("prompt") ||
    joined.includes("prompts") ||
    joined.includes("text") ||
    joined.includes("content")
  );
}

function makeTitleFromPrompt(prompt) {
  const cleaned = String(prompt || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Untitled Prompt";
  const words = cleaned.split(" ").slice(0, 7).join(" ");
  return cleaned.split(" ").length > 7 ? `${words}…` : words;
}

export default function PromptList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const url = `${import.meta.env.BASE_URL}Lissafi.csv`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load CSV: ${res.status}`);

        const text = await res.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (!lines.length) throw new Error("CSV is empty.");

        const first = parseCsvLine(lines[0]);
        const hasHeader = looksLikeHeader(first);

        let headers = [];
        let dataLines = lines;

        if (hasHeader) {
          headers = first;
          dataLines = lines.slice(1);
        }

        const parsed = dataLines
          .map((line) => {
            const cols = parseCsvLine(line);
            if (!cols.length) return null;

            // Header mapping (your CSV has: Category, Subcategory, Prompts)
            if (hasHeader) {
              const obj = {};
              headers.forEach((h, i) => (obj[norm(h)] = cols[i] ?? ""));

              const c = obj["category"] || obj["cat"] || "Uncategorized";
              const s =
                obj["subcategory"] ||
                obj["sub category"] ||
                obj["sub_category"] ||
                obj["subcat"] ||
                "General";

              // ✅ IMPORTANT FIX: support "prompts" column
              const p =
                obj["prompts"] ||
                obj["prompt"] ||
                obj["text"] ||
                obj["content"] ||
                obj["body"] ||
                "";

              if (!p) return null;

              const t =
                obj["title"] ||
                obj["name"] ||
                obj["prompt title"] ||
                makeTitleFromPrompt(p);

              return {
                category: String(c).trim() || "Uncategorized",
                subcategory: String(s).trim() || "General",
                title: String(t).trim() || makeTitleFromPrompt(p),
                prompt: String(p).trim(),
              };
            }

            // No header fallbacks
            if (cols.length >= 3) {
              const prompt = cols.slice(2).join(",").trim();
              if (!prompt) return null;
              return {
                category: cols[0] || "Uncategorized",
                subcategory: cols[1] || "General",
                title: makeTitleFromPrompt(prompt),
                prompt,
              };
            }

            return null;
          })
          .filter(Boolean);

        if (alive) setRows(parsed);
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
    const set = new Set(rows.map((r) => r.category).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const subcategories = useMemo(() => {
    if (!category) return [];
    const set = new Set(
      rows
        .filter((r) => r.category === category)
        .map((r) => r.subcategory)
        .filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, category]);

  // Show ONLY if search has value OR (category AND subcategory selected)
  const showPrompts = useMemo(() => {
    if (search.trim().length > 0) return true;
    return Boolean(category) && Boolean(subcategory);
  }, [search, category, subcategory]);

  const filtered = useMemo(() => {
    if (!showPrompts) return [];

    const q = search.trim().toLowerCase();

    // Search mode ignores selections
    if (q.length > 0) {
      return rows.filter((r) =>
        `${r.title} ${r.prompt} ${r.category} ${r.subcategory}`
          .toLowerCase()
          .includes(q)
      );
    }

    // Selection mode requires category + subcategory
    return rows.filter(
      (r) => r.category === category && r.subcategory === subcategory
    );
  }, [rows, search, showPrompts, category, subcategory]);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setSubcategory("");
  };

  if (loading) return <p className="loading">Loading prompts…</p>;
  if (err) return <p className="loading">Error: {err}</p>;

  return (
    <div className="browser">
      <div className="controls">
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts (e.g., text, resume, business)..."
            type="search"
          />
        </div>

        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            className="select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory("");
            }}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option value={c} key={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="subcategory">Subcategory</label>
          <select
            id="subcategory"
            className="select"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            disabled={!category}
          >
            <option value="">Select subcategory</option>
            {subcategories.map((s) => (
              <option value={s} key={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-secondary clear-btn"
          type="button"
          onClick={clearFilters}
        >
          Clear
        </button>
      </div>

      {!showPrompts ? (
        <div className="empty-state">
          <p>
            Prompts will appear only when you <strong>search</strong> or select a{" "}
            <strong>category + subcategory</strong>.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No prompts match your current search/selection.</p>
        </div>
      ) : (
        <div className="prompt-grid">
          {filtered.map((p, i) => (
            <div className="prompt-card" key={`${p.title}-${i}`}>
              <div className="meta">
                <span className="prompt-category">{p.category}</span>
                <span className="prompt-subcategory">{p.subcategory}</span>
              </div>

              <h3>{p.title}</h3>
              <p>{p.prompt}</p>

              <button
                className="btn-secondary"
                type="button"
                onClick={() => navigator.clipboard.writeText(p.prompt)}
              >
                Copy Prompt
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
