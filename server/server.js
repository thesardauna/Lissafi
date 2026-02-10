import express from "express";
import cors from "cors";
import { addRow, readCsvText } from "./csvStore.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/prompts/csv", async (_req, res) => {
  try {
    const text = await readCsvText();
    res.type("text/csv").send(text);
  } catch (e) {
    res.status(500).json({ error: "Failed to read CSV." });
  }
});

app.post("/api/prompts/add", async (req, res) => {
  const { Category, Subcategory, Prompts } = req.body || {};
  const result = await addRow({ Category, Subcategory, Prompts });
  res.status(result.status).json({ ok: result.ok, message: result.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Lissafi server running on http://localhost:${PORT}`);
});
