import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

const norm = (v) => (v ?? "").toString().trim();
const lower = (v) => norm(v).toLowerCase();

function pickCol(headers, candidates) {
  const map = new Map(headers.map((h) => [h.toLowerCase(), h]));
  for (const c of candidates) if (map.has(c)) return map.get(c);
  for (const h of headers) {
    const hl = h.toLowerCase();
    if (candidates.some((c) => hl.includes(c))) return h;
  }
  return null;
}

export default function App() {
  const [rawRows, setRawRows] = useState([]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const csvUrl = `${import.meta.env.BASE_URL}Lissafi.csv`;
      const res = await fetch(csvUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load CSV (${res.status})`);
      const text = await res.text();
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false
      });

      if (parsed.errors?.length) {
        // keep data but show a lightweight warning
        console.warn("CSV parse warnings:", parsed.errors);
      }
      setRawRows(Array.isArray(parsed.data) ? parsed.data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load CSV");
      setRawRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => window.clearTimeout(toastTimer.current);
  }, []);

  // Detect header names from CSV (supports different column spellings)
  const colMap = useMemo(() => {
    const headers = rawRows.length ? Object.keys(rawRows[0] || {}) : [];
    const Category = pickCol(headers, ["category"]);
    const Subcategory = pickCol(headers, ["subcategory", "sub category", "sub-cat", "sub_cat"]);
    const Prompts = pickCol(headers, ["prompts", "prompt", "text", "content"]);
    return { Category, Subcategory, Prompts };
  }, [rawRows]);

  // Normalize + de-duplicate + keep stable order
  const normalized = useMemo(() => {
    const { Category, Subcategory, Prompts } = colMap;
    if (!Category || !Subcategory || !Prompts) return [];

    const seen = new Set();
    const out = [];

    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i];
      const cat = norm(r[Category]);
      const sub = norm(r[Subcategory]);
      const p = (r[Prompts] ?? "").toString();

      if (!cat || !sub) continue;

      const key = `${cat}||${sub}||${p}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({ Category: cat, Subcategory: sub, Prompts: p, _row: i + 1 });
    }

    return out;
  }, [rawRows, colMap]);

  const categories = useMemo(() => {
    return Array.from(new Set(normalized.map((r) => r.Category))).sort((a, b) => a.localeCompare(b));
  }, [normalized]);

  const subcategories = useMemo(() => {
    if (!selectedCategory) return [];
    return Array.from(
      new Set(normalized.filter((r) => r.Category === selectedCategory).map((r) => r.Subcategory))
    ).sort((a, b) => a.localeCompare(b));
  }, [normalized, selectedCategory]);

  // Keep dropdown selections valid when data changes
  useEffect(() => {
    if (!selectedCategory) return;
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory("");
      setSelectedSubcategory("");
      return;
    }
    if (selectedSubcategory && !subcategories.includes(selectedSubcategory)) {
      setSelectedSubcategory("");
    }
  }, [categories, subcategories, selectedCategory, selectedSubcategory]);

  const dropdownPrompts = useMemo(() => {
    if (!selectedCategory || !selectedSubcategory) return [];
    return normalized
      .filter((r) => r.Category === selectedCategory && r.Subcategory === selectedSubcategory)
      .map((r) => r.Prompts)
      .filter((p) => norm(p));
  }, [normalized, selectedCategory, selectedSubcategory]);

  // Search groups (supports multi-word search)
  const searchResults = useMemo(() => {
    const q = lower(search);
    if (!q) return null;

    const tokens = q.split(/\s+/).filter(Boolean);
    const groups = new Map();

    for (const r of normalized) {
      const promptText = (r.Prompts ?? "").toString();
      const hay = `${r.Category}\n${r.Subcategory}\n${promptText}`.toLowerCase();
      if (!tokens.every((t) => hay.includes(t))) continue;

      if (!groups.has(r.Category)) groups.set(r.Category, new Map());
      const subMap = groups.get(r.Category);

      if (!subMap.has(r.Subcategory)) subMap.set(r.Subcategory, []);
      if (norm(promptText)) subMap.get(r.Subcategory).push(promptText);
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([Category, subMap]) => ({
        Category,
        Subcategories: Array.from(subMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([Subcategory, Prompts]) => ({ Subcategory, Prompts }))
      }));
  }, [normalized, search]);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1400);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied");
    } catch {
      // fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast("Copied");
      } catch {
        showToast("Copy failed");
      }
    }
  }

  const showSearch = Boolean(searchResults);
  const showDropdownPrompts = !showSearch && selectedCategory && selectedSubcategory;

  const totals = useMemo(() => {
    return {
      rows: normalized.length,
      categories: categories.length
    };
  }, [normalized, categories]);

  const badHeader = useMemo(() => {
    const { Category, Subcategory, Prompts } = colMap;
    return rawRows.length > 0 && (!Category || !Subcategory || !Prompts);
  }, [rawRows, colMap]);

  return (
    <div className="page">
      <div className="bg" />

      <header className="header">
        <div className="brand">Lissafi</div>
        <div className="tag">Prompt Library</div>
      </header>

      <main className="main">
        <section className="panel">
          <div className="panelTitle">About Lissafi</div>

          <div className="about">
            <p>
              <strong>Lissafi</strong> helps you quickly discover, explore, and copy prompts by
              category and subcategory.
            </p>

            <div className="hint">
              {loading ? "Loading prompts…" : `Loaded ${totals.rows} prompts across ${totals.categories} categories.`}
            </div>

            {err ? (
              <div className="empty">
                {err}{" "}
                <button className="copy" type="button" onClick={load}>
                  Retry
                </button>
              </div>
            ) : null}

            {badHeader ? (
              <div className="empty">
                CSV headers not detected. Expected something like: <strong>Category</strong>,{" "}
                <strong>Subcategory</strong>, <strong>Prompts</strong>.
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="panelTitle">Search</div>
          <input
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category, subcategory, prompts…"
            aria-label="Search"
          />
          <div className="hint">Tip: use multiple words (e.g. “video hook”).</div>
        </section>

        <section className="panel">
          <div className="panelTitle">Browse</div>

          <div className="controls">
            <div className="control">
              <label className="label">Category</label>
              <select
                className="select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory("");
                }}
                disabled={loading || !!err || badHeader}
              >
                <option value="">Choose a category…</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="control">
              <label className="label">Subcategory</label>
              <select
                className="select"
                value={selectedSubcategory}
                disabled={!selectedCategory || loading || !!err || badHeader}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
              >
                <option value="">
                  {selectedCategory ? "Choose a subcategory…" : "Select category first"}
                </option>
                {subcategories.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="control" style={{ alignSelf: "end" }}>
              <button
                className="copy"
                type="button"
                onClick={() => {
                  setSelectedCategory("");
                  setSelectedSubcategory("");
                  setSearch("");
                  showToast("Cleared");
                }}
                disabled={loading}
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        {showSearch ? (
          <section className="panel">
            <div className="panelTitle">Results</div>

            {searchResults.length === 0 ? (
              <div className="empty">No matches.</div>
            ) : (
              <div className="results">
                {searchResults.map((g) => (
                  <div key={g.Category} className="resultGroup">
                    <div className="resultCat">{g.Category}</div>

                    {g.Subcategories.map((s) => (
                      <div key={`${g.Category}-${s.Subcategory}`} className="resultSub">
                        <div className="resultSubHead">
                          <span>{s.Subcategory}</span>
                          <span className="rowMeta">{s.Prompts.length}</span>
                        </div>

                        <div className="cards">
                          {s.Prompts.length === 0 ? (
                            <div className="empty">No prompts yet.</div>
                          ) : (
                            s.Prompts.map((p, idx) => (
                              <div className="card" key={`${g.Category}-${s.Subcategory}-${idx}`}>
                                <div className="prompt">{p}</div>
                                <button className="copy" onClick={() => copy(p)} type="button">
                                  Copy
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {showDropdownPrompts ? (
          <section className="panel">
            <div className="panelTitle">
              Prompts <span className="rowMeta">{dropdownPrompts.length}</span>
            </div>

            <div className="cards">
              {dropdownPrompts.length === 0 ? (
                <div className="empty">No prompts yet.</div>
              ) : (
                dropdownPrompts.map((p, idx) => (
                  <div className="card" key={`${selectedSubcategory}-${idx}`}>
                    <div className="prompt">{p}</div>
                    <button className="copy" onClick={() => copy(p)} type="button">
                      Copy
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}
      </main>

      {toast ? <div className="toast">{toast}</div> : null}
      <footer className="footer footerFixed">© Lissafi</footer>
    </div>
  );
}
