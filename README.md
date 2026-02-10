# Lissafi

CSV-driven sci-fi prompt-category library with a tiny Express backend to append new rows.

## Data schema (strict)
`Category,Subcategory,Prompts`

- CSV is the single source of truth.
- Rows are de-duplicated automatically.
- Grouping: Category -> Subcategory -> Prompts.
- Blank `Prompts` means the subcategory exists but has no prompts yet.

## Run locally

### 1) Server
```bash
cd server
npm install
npm start
