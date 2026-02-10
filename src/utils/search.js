function norm(s) {
  return (s ?? "").toString().toLowerCase().trim();
}

export function rankAndFilterPrompts(prompts, query, selectedCategories) {
  const q = norm(query);

  const catSet = new Set((selectedCategories ?? []).map((c) => norm(c)));

  const filteredByCategory = prompts.filter((p) => {
    if (catSet.size === 0) return true;
    return catSet.has(norm(p.category));
  });

  if (!q) return filteredByCategory.map((p) => ({ p, score: 0 })).map((x) => x.p);

  const scored = filteredByCategory
    .map((p) => {
      const title = norm(p.title);
      const category = norm(p.category);
      const tags = (p.tags ?? []).map(norm).join(" ");
      const useCase = norm(p.use_case);
      const notes = norm(p.notes);
      const promptText = norm(p.prompt);

      let score = 0;

      // Title ranking
      if (title === q) score += 1000;
      else if (title.startsWith(q)) score += 500;
      else if (title.includes(q)) score += 250;

      // Category and tags
      if (category === q) score += 220;
      else if (category.includes(q)) score += 110;

      if (tags.includes(q)) score += 120;

      // Use case and notes
      if (useCase.includes(q)) score += 80;
      if (notes.includes(q)) score += 40;

      // Prompt body, low weight to keep results relevant
      if (promptText.includes(q)) score += 15;

      // Bonus for shorter title distance, if present
      if (score > 0) score += Math.max(0, 30 - Math.abs(title.length - q.length));

      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title));

  return scored.map((x) => x.p);
}
