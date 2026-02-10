export function dedupeAndGroup(rows) {
  const seen = new Set();
  const cleaned = [];

  for (const r of rows) {
    const Category = (r.Category ?? "").toString().trim();
    const Subcategory = (r.Subcategory ?? "").toString().trim();
    const Prompts = (r.Prompts ?? "").toString();

    if (!Category || !Subcategory) continue;

    const key = `${Category}|${Subcategory}|${Prompts}`;
    if (seen.has(key)) continue;
    seen.add(key);

    cleaned.push({ Category, Subcategory, Prompts });
  }

  // Group: Category -> Subcategory -> prompts[]
  const grouped = new Map();

  for (const r of cleaned) {
    if (!grouped.has(r.Category)) grouped.set(r.Category, new Map());
    const subMap = grouped.get(r.Category);
    if (!subMap.has(r.Subcategory)) subMap.set(r.Subcategory, []);
    if (r.Prompts.trim()) subMap.get(r.Subcategory).push(r.Prompts);
    // If prompt blank, subcategory still exists with empty list.
  }

  // Convert to arrays for stable render
  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, subMap]) => ({
      Category: cat,
      Subcategories: Array.from(subMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([sub, prompts]) => ({ Subcategory: sub, Prompts: prompts }))
    }));
}
