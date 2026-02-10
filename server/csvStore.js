import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const ROOT = path.resolve(process.cwd(), "..");
const CSV_PATH = path.join(ROOT, "Lissafi.csv");

let lock = Promise.resolve();
function withLock(fn) {
  lock = lock.then(fn, fn);
  return lock;
}

function clean(v) {
  return (v ?? "").toString().trim();
}

export async function readCsvText() {
  return fs.readFile(CSV_PATH, "utf8");
}

export async function readRows() {
  const text = await readCsvText();
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true
  });

  // Strict schema: only these keys matter.
  return records.map((r) => ({
    Category: clean(r.Category),
    Subcategory: clean(r.Subcategory),
    Prompts: (r.Prompts ?? "").toString() // keep prompt text as-is (may contain newlines)
  }));
}

export async function addRow({ Category, Subcategory, Prompts }) {
  return withLock(async () => {
    const cat = clean(Category);
    const sub = clean(Subcategory);
    const pr = (Prompts ?? "").toString();

    if (!cat || !sub) {
      return { ok: false, status: 400, message: "Category and Subcategory are required." };
    }

    const rows = await readRows();

    const normalizedNew = {
      Category: cat,
      Subcategory: sub,
      Prompts: pr
    };

    const isDup = rows.some(
      (r) =>
        clean(r.Category) === cat &&
        clean(r.Subcategory) === sub &&
        (r.Prompts ?? "").toString() === pr
    );

    if (isDup) {
      return { ok: false, status: 409, message: "Duplicate row already exists." };
    }

    // Append safely by rewriting full CSV (simple + robust for MVP).
    const all = [...rows, normalizedNew];

    // De-duplicate identical rows (strict match).
    const seen = new Set();
    const deduped = all.filter((r) => {
      const key = `${clean(r.Category)}|${clean(r.Subcategory)}|${(r.Prompts ?? "").toString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const out = stringify(deduped, {
      header: true,
      columns: ["Category", "Subcategory", "Prompts"]
    });

    await fs.writeFile(CSV_PATH, out, "utf8");
    return { ok: true, status: 200, message: "Row added." };
  });
}
