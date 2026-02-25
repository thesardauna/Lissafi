import { useEffect, useState } from "react";

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

export default function PromptList() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
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
            const category = cols[0] ?? "";
            const title = cols[1] ?? "";
            const prompt = cols.slice(2).join(",") ?? "";
            if (!title || !prompt) return null;
            return { category, title, prompt };
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

  if (loading) return <p className="loading">Loading prompts…</p>;
  if (err) return <p className="loading">Error: {err}</p>;
  if (!prompts.length) return <p className="loading">No prompts found.</p>;

  return (
    <div className="prompt-grid">
      {prompts.map((p, i) => (
        <div className="prompt-card" key={`${p.title}-${i}`}>
          {p.category ? (
            <span className="prompt-category">{p.category}</span>
          ) : null}
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
  );
}
