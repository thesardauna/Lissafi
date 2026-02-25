import { useEffect, useState } from "react";

export default function PromptList() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/Lissafi.csv")
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split("\n").slice(1);
        const parsed = lines
          .map((line) => {
            const [category, title, prompt] = line.split(",");
            if (!title || !prompt) return null;
            return { category, title, prompt };
          })
          .filter(Boolean);

        setPrompts(parsed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Loading prompts…</p>;

  return (
    <div className="prompt-grid">
      {prompts.map((p, i) => (
        <div className="prompt-card" key={i}>
          <span className="prompt-category">{p.category}</span>
          <h3>{p.title}</h3>
          <p>{p.prompt}</p>
          <button
            className="btn-secondary"
            onClick={() => navigator.clipboard.writeText(p.prompt)}
          >
            Copy Prompt
          </button>
        </div>
      ))}
    </div>
  );
}
