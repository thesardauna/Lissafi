function pick(row, name) {
  if (!row || typeof row !== "object") return "";
  const target = name.toLowerCase();

  if (row[name] != null) return row[name];

  for (const k of Object.keys(row)) {
    const key = (k ?? "").toString().replace(/^\uFEFF/, "").trim().toLowerCase();
    if (key === target) return row[k];
  }
  return "";
}

export function dedupeAndGroup(rows) {
  const seen = new Set();
  const cleaned = [];

  for (const r of rows) {
    const Category = (pick(r, "Category") ?? "").toString().trim();
    const Subcategory = (pick(r, "Subcategory") ?? "").toString().trim();
    const Prompts = (pick(r, "Prompts") ?? "").toString();

    if (!Category || !Subcategory) continue;

    const key = `${Category}|${Subcategory}|${Prompts}`;
    if (seen.has(key)) continue;
    seen.add(key);

    cleaned.push({ Category, Subcategory, Prompts });
  }

  const grouped = new Map();

  for (const r of cleaned) {
    if (!grouped.has(r.Category)) grouped.set(r.Category, new Map());
    const subMap = grouped.get(r.Category);

    if (!subMap.has(r.Subcategory)) subMap.set(r.Subcategory, []);

    if (r.Prompts.trim()) subMap.get(r.Subcategory).push(r.Prompts);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, subMap]) => ({
      Category: cat,
      Subcategories: Array.from(subMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([sub, prompts]) => ({ Subcategory: sub, Prompts: prompts }))
    }));
}
