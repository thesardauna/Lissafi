import Papa from "papaparse";

/**
 * Loads and parses public/Lissafi.csv.
 * Works offline after initial load because it is served as a static asset.
 */
export async function loadPromptsFromCSV(path = `${import.meta.env.BASE_URL}Lissafi.csv`) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load CSV (${res.status}). Ensure public/Lissafi.csv exists.`);
  }
  const text = await res.text();

  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true
  });

  const rows = Array.isArray(parsed.data) ? parsed.data : [];

  // Normalize and handle missing columns gracefully.
  const normalized = rows
    .map((r, idx) => {
      const title = (r.title ?? "").toString().trim();
      const category = (r.category ?? "Uncategorized").toString().trim() || "Uncategorized";
      const prompt = (r.prompt ?? "").toString();

      const tagsRaw = (r.tags ?? "").toString();
      const tags = tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const use_case = (r.use_case ?? "").toString().trim();
      const notes = (r.notes ?? "").toString().trim();

      // Optional columns
      const date = (r.date ?? "").toString().trim(); // supports sorting if present

      // Stable, shareable ID: prefer explicit id, else derive from title.
      // FIX: Do not mix ?? and || without parentheses.
      const base = ((r.id ?? title) || `prompt-${idx}`).toString();
      const id = slugify(base);

      return {
        id,
        title: title || `Untitled Prompt ${idx + 1}`,
        category,
        prompt,
        tags,
        use_case,
        notes,
        date,
        _row: idx
      };
    })
    // Drop completely empty rows.
    .filter((p) => p.title || p.prompt);

  return normalized;
}

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
