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
  return out;
}

function norm(s) {
  return String(s ?? "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .toLowerCase();
}

function pickKey(headers, candidates) {
  const h = headers.map((x) => norm(x));
  for (const c of candidates) {
    const idx = h.indexOf(norm(c));
    if (idx !== -1) return headers[idx];
  }
  return null;
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
        if (lines.length < 2) throw new Error("CSV has no data rows.");

        const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^"+|"+$/g, "").trim());
        const catKey = pickKey(headers, ["category", "cat"]);
        const subKey = pickKey(headers, ["subcategory", "sub category", "sub_category", "subcat"]);
        const titleKey = pickKey(headers, ["title", "prompt title", "name"]);
        const promptKey = pickKey(headers, ["prompt", "text", "content", "body"]);

        const parsed = lines.slice(1).map((line) => {
          const cols = parseCsvLine(line);

          // If headers exist, map by header index.
          const obj = {};
          if (headers.length && cols.length) {
            headers.forEach((h, i) => {
              obj[h] = cols[i] ?? "";
            });
          }

          // Robust fallbacks if headers are not present/usable
          const fallback = () => {
            // common patterns:
            // 4+ cols: category, subcategory, title, prompt...
            // 3 cols: category, title, prompt...
            if (cols.length >= 4) {
              return {
                Category: cols[0] ?? "",
                Subcategory: cols[1] ?? "",
                Title: cols[2] ?? "",
                Prompt: cols.slice(3).join(",") ?? "",
              };
            }
            if (cols.length === 3) {
              return {
                Category: cols[0] ?? "",
                Title: cols[1] ?? "",
                Prompt: cols[2] ?? "",
              };
            }
            return null;
          };

          const row = headers.length ? obj : fallback();
          if (!row) return null;

          const c = row[catKey] ?? row.Category ?? "";
          const s = row[subKey] ?? row.Subcategory ?? "";
          const t = row[titleKey] ?? row.Title ?? "";
          const p = row[promptKey] ?? row.Prompt ?? "";

          if (!t || !p) return null;

          return {
            category: String(c).replace(/^"+|"+$/g, "").trim(),
            subcategory: String(s).replace(/^"+|"+$/g, "").trim(),
            title: String(t).replace(/^"+|"+$/g, "").trim(),
            prompt: String(p).replace(/^"+|"+$/g, "").trim(),
          };
        }).filter(Boolean);

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

  const needsSubcategory = subcategories.length > 0;

  const showPrompts = useMemo(() => {
    const q = search.trim();
    if (q.length > 0) return true;
    if (!category) return false;
    if (needsSubcategory) return Boolean(subcategory);
    return true; // if dataset has no subcategory values, category alone is enough
  }, [search, category, subcategory, needsSubcategory]);

  const filtered = useMemo(() => {
    if (!showPrompts) return [];

    const q = search.trim().toLowerCase();

    return rows.filter((r) => {
      const matchSearch =
        q.length === 0
          ? true
          : (r.title + " " + r.prompt + " " + r.category + " " + r.subcategory)
              .toLowerCase()
              .includes(q);

      const matchCat = category ? r.category === category : true;

      const matchSub = needsSubcategory
        ? subcategory
          ? r.subcategory === subcategory
          : false // must select subcategory if subcategories exist
        : true;

      // If searching, we don’t force category/subcategory
      if (q.length > 0) return matchSearch;

      return matchCat && matchSub;
    });
  }, [rows, search, category, subcategory, showPrompts, needsSubcategory]);

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
            placeholder="Search prompts (e.g., resume, logo, CV, business)..."
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
            disabled={!category || subcategories.length === 0}
          >
            <option value="">
              {subcategories.length ? "Select subcategory" : "No subcategories"}
            </option>
            {subcategories.map((s) => (
              <option value={s} key={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button className="btn-secondary clear-btn" type="button" onClick={clearFilters}>
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
                {p.category ? <span className="prompt-category">{p.category}</span> : null}
                {p.subcategory ? <span className="prompt-subcategory">{p.subcategory}</span> : null}
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
