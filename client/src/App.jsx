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
    const csvUrl = import.meta.env.DEV
      ? "/api/prompts/csv"
      : `${import.meta.env.BASE_URL}Lissafi.csv`;

    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error("Failed to load CSV");
    const text = await res.text();

    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => (h ?? "").toString().replace(/^\uFEFF/, "").trim()
    });

    setRows(Array.isArray(parsed.data) ? parsed.data : []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const grouped = useMemo(() => dedupeAndGroup(rows), [rows]);

  const filteredGrouped = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return grouped;

    return grouped
      .map((c) => {
        const catHit = c.Category.toLowerCase().includes(query);

        const subs = c.Subcategories
          .map((s) => {
            const subHit = s.Subcategory.toLowerCase().includes(query);
            const promptsHit = s.Prompts.filter((p) => p.toLowerCase().includes(query));
            const keep = catHit || subHit || promptsHit.length > 0;

            if (!keep) return null;

            return {
              ...s,
              Prompts: catHit || subHit ? s.Prompts : promptsHit
            };
          })
          .filter(Boolean);

        return subs.length ? { ...c, Subcategories: subs } : null;
      })
      .filter(Boolean);
  }, [grouped, q]);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(window.__lissafiToast);
    window.__lissafiToast = window.setTimeout(() => setToast(""), 1800);
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
      await load();
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
                    type="button"
                  >
                    <span className="rowText">{c.Category}</span>
                    <span className="rowMeta">{c.Subcategories.length}</span>
                  </button>

                  {isOpen ? (
                    <div className="subList">
                      {c.Subcategories.map((s) => {
                        const subOpen =
                          openSub.cat === c.Category && openSub.sub === s.Subcategory;

                        return (
                          <div key={s.Subcategory} className="subItem">
                            <button
                              className={`subRow ${subOpen ? "active" : ""}`}
                              onClick={() =>
                                setOpenSub(
                                  subOpen ? { cat: "", sub: "" } : { cat: c.Category, sub: s.Subcategory }
                                )
                              }
                              type="button"
                            >
                              <span className="rowText">{s.Subcategory}</span>
                              <span className="rowMeta">{s.Prompts.length}</span>
                            </button>

                            {subOpen ? (
                              <div className="cards">
                                {s.Prompts.length === 0 ? (
                                  <div className="empty">No prompts yet.</div>
                                ) : (
                                  s.Prompts.map((p, idx) => (
                                    <div className="card" key={`${s.Subcategory}-${idx}`}>
                                      <div className="prompt">{p}</div>
                                      <button className="copy" onClick={() => copy(p)} type="button">
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

          <div className="empty" style={{ marginBottom: 10 }}>
            GitHub Pages cannot run the server. This form works locally (DEV) only.
          </div>

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
            <button className="btn" disabled={busy || !import.meta.env.DEV} type="submit">
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
