import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

export default function App() {
  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  const [search, setSearch] = useState("");

  async function load() {
    const csvUrl = `${import.meta.env.BASE_URL}Lissafi.csv`;
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error("Failed to load CSV");
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    setRows(Array.isArray(parsed.data) ? parsed.data : []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const normalized = useMemo(() => {
    const seen = new Set();
    return rows
      .map((r) => {
        const Category = (r.Category ?? "").toString().trim();
        const Subcategory = (r.Subcategory ?? "").toString().trim();
        const Prompts = (r.Prompts ?? "").toString();
        return { Category, Subcategory, Prompts };
      })
      .filter((r) => r.Category && r.Subcategory)
      .filter((r) => {
        const key = `${r.Category}|${r.Subcategory}|${r.Prompts}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [rows]);

  const categories = useMemo(() => {
    return Array.from(new Set(normalized.map((r) => r.Category))).sort((a, b) => a.localeCompare(b));
  }, [normalized]);

  const subcategories = useMemo(() => {
    if (!selectedCategory) return [];
    return Array.from(
      new Set(normalized.filter((r) => r.Category === selectedCategory).map((r) => r.Subcategory))
    ).sort((a, b) => a.localeCompare(b));
  }, [normalized, selectedCategory]);

  const dropdownPrompts = useMemo(() => {
    if (!selectedCategory || !selectedSubcategory) return [];
    return normalized
      .filter((r) => r.Category === selectedCategory && r.Subcategory === selectedSubcategory)
      .map((r) => r.Prompts)
      .filter((p) => p.trim());
  }, [normalized, selectedCategory, selectedSubcategory]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;

    const groups = new Map();

    for (const r of normalized) {
      const promptText = (r.Prompts ?? "").toString();
      const hay = `${r.Category}\n${r.Subcategory}\n${promptText}`.toLowerCase();
      if (!hay.includes(q)) continue;

      if (!groups.has(r.Category)) groups.set(r.Category, new Map());
      const subMap = groups.get(r.Category);
      if (!subMap.has(r.Subcategory)) subMap.set(r.Subcategory, []);

      if (promptText.trim()) subMap.get(r.Subcategory).push(promptText);
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
    window.clearTimeout(window.__lissafiToast);
    window.__lissafiToast = window.setTimeout(() => setToast(""), 1600);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied");
    } catch {
      showToast("Copy failed");
    }
  }

  const showSearch = Boolean(searchResults);
  const showDropdownPrompts = !showSearch && selectedCategory && selectedSubcategory;

  return (
    <div className="page">
      <div className="bg" />

      <header className="header">
        <div className="brand">Lissafi</div>
        <div className="tag">Prompt Library</div>
      </header>

      <main className="main">
        <section className="panel">
          <div className="panelTitle">Search</div>
          <input
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Category, Subcategory, Prompts..."
            aria-label="Search"
          />
          <div className="hint">
            Search works without selecting a category. Clear search to use dropdown browsing.
          </div>
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
                disabled={!selectedCategory}
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
          </div>
        </section>

        {/* Search results take priority when search is non-empty */}
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

        {/* Dropdown browsing (only when search is empty) */}
        {showDropdownPrompts ? (
          <section className="panel">
            <div className="panelTitle">Prompts</div>

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
