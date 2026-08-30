# The Binder

Catalog sports, Pokémon, and TCG cards from a photo of a binder page.

- Scan a sleeve, crop one card, fill details
- Identify a whole page (optional xAI key)
- Collection view in 9-pocket pages
- Search, filters, export / import JSON
- Saves in the browser (IndexedDB)

## Run locally

Needs Node.js 22+.

```bash
npm install
```

**Windows (PowerShell)** — `npm run dev` may fail with `spawn vite ENOENT`. Use:

```powershell
node .\node_modules\vite\bin\vite.js dev --host 0.0.0.0 --port 8080
```

**macOS / Linux:**

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

### Identify cards (optional)

Copy `.env.example` to `.env` and set `XAI_API_KEY`. Restart the server after changing it. Crop, manual add, and Collection work without a key.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 8080 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
