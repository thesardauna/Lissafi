import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

export default function App() {
  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

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

  const prompts = useMemo(() => {
    if (!selectedCategory || !selectedSubcategory) return [];
    return normalized
      .filter((r) => r.Category === selectedCategory && r.Subcategory === selectedSubcategory)
      .map((r) => r.Prompts)
      .filter((p) => p.trim());
  }, [normalized, selectedCategory, selectedSubcategory]);

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

  return (
    <div className="page">
      <div className="bg" />

      <header className="header">
        <div className="brand">Lissafi</div>
        <div className="tag">Prompt Library</div>
      </header>

      <main className="main">
        <section className="panel">
          <div className="panelTitle">Select</div>

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

        {selectedCategory && selectedSubcategory ? (
          <section className="panel">
            <div className="panelTitle">Prompts</div>

            <div className="cards">
              {prompts.length === 0 ? (
                <div className="empty">No prompts yet.</div>
              ) : (
                prompts.map((p, idx) => (
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
