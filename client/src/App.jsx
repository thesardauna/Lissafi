import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { dedupeAndGroup } from "./utils/group";

export default function App() {
  const [rows, setRows] = useState([]);
  const [openCat, setOpenCat] = useState("");
  const [openSub, setOpenSub] = useState({ cat: "", sub: "" });
  const [q, setQ] = useState("");
  const [toast, setToast] = useState("");
  const [admin, setAdmin] = useState({ Category: "", Subcategory: "", Prompts: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/prompts/csv");
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    setRows(Array.isArray(parsed.data) ? parsed.data : []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const grouped = useMemo(() => dedupeAndGroup(rows), [rows]);

  const filteredGrouped = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return grouped;

    // Search across Category, Subcategory, Prompts; keep structure.
    return grouped
      .map((c) => {
        const catHit = c.Category.toLowerCase().includes(query);
        const subs = c.Subcategories
          .map((s) => {
            const subHit = s.Subcategory.toLowerCase().includes(query);
            const promptsHit = s.Prompts.filter((p) => p.toLowerCase().includes(query));
            const keep = catHit || subHit || promptsHit.length > 0;
            return keep ? { ...s, Prompts: catHit || subHit ? s.Prompts : promptsHit } : null;
          })
          .filter(Boolean);

        return subs.length ? { ...c, Subcategories: subs } : null;
      })
      .filter(Boolean);
  }, [grouped, q]);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__t);
    window.__t = window.setTimeout(() => setToast(""), 1800);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied");
    } catch {
      showToast("Copy failed");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/prompts/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(admin)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Failed");
        return;
      }
      showToast("Added");
      setAdmin({ Category: "", Subcategory: "", Prompts: "" });
      await load(); // reflect updates immediately
    } finally {
      setBusy(false);
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
        <div className="searchWrap">
          <input
            className="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Category, Subcategory, Prompts..."
            aria-label="Search"
          />
        </div>

        <section className="panel">
          <div className="panelTitle">Categories</div>

          {/* Categories only by default */}
          <div className="list">
            {filteredGrouped.map((c) => {
              const isOpen = openCat === c.Category;
              return (
                <div key={c.Category} className="item">
                  <button
                    className={`row ${isOpen ? "active" : ""}`}
                    onClick={() => {
                      setOpenCat(isOpen ? "" : c.Category);
                      setOpenSub({ cat: "", sub: "" });
                    }}
                  >
                    <span className="rowText">{c.Category}</span>
                    <span className="rowMeta">{c.Subcategories.length}</span>
                  </button>

                  {/* Subcategories appear only after Category click */}
                  {isOpen ? (
                    <div className="subList">
                      {c.Subcategories.map((s) => {
                        const subOpen = openSub.cat === c.Category && openSub.sub === s.Subcategory;
                        return (
                          <div key={s.Subcategory} className="subItem">
                            <button
                              className={`subRow ${subOpen ? "active" : ""}`}
                              onClick={() =>
                                setOpenSub(subOpen ? { cat: "", sub: "" } : { cat: c.Category, sub: s.Subcategory })
                              }
                            >
                              <span className="rowText">{s.Subcategory}</span>
                              <span className="rowMeta">{s.Prompts.length}</span>
                            </button>

                            {/* Prompts appear only after Subcategory click */}
                            {subOpen ? (
                              <div className="cards">
                                {s.Prompts.length === 0 ? (
                                  <div className="empty">No prompts yet.</div>
                                ) : (
                                  s.Prompts.map((p, idx) => (
                                    <div className="card" key={`${s.Subcategory}-${idx}`}>
                                      <div className="prompt">{p}</div>
                                      <button className="copy" onClick={() => copy(p)}>
                                        Copy
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panelTitle">Admin: Add Row (Appends to CSV)</div>
          <form className="form" onSubmit={submit}>
            <input
              className="input"
              value={admin.Category}
              onChange={(e) => setAdmin((s) => ({ ...s, Category: e.target.value }))}
              placeholder="Category"
            />
            <input
              className="input"
              value={admin.Subcategory}
              onChange={(e) => setAdmin((s) => ({ ...s, Subcategory: e.target.value }))}
              placeholder="Subcategory"
            />
            <textarea
              className="textarea"
              value={admin.Prompts}
              onChange={(e) => setAdmin((s) => ({ ...s, Prompts: e.target.value }))}
              placeholder="Prompts (can be blank)"
              rows={4}
            />
            <button className="btn" disabled={busy}>
              {busy ? "Saving..." : "Add"}
            </button>
          </form>
        </section>
      </main>

      {toast ? <div className="toast">{toast}</div> : null}
      <footer className="footer">CSV-driven. Minimal sci-fi UI. Fast search.</footer>
    </div>
  );
}
