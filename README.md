# The Card Binder

Catalog sports, Pokémon, and TCG cards from a photo of a binder page.

- Scan a sleeve, **split into 9 pockets**, crop one card, or identify the page
- Review/edit before saving — duplicate warnings included
- Sports vs TCG fields, condition picker, singles vs sealed, owned vs wishlist
- Collection as real 9-pocket pages (move via page/pocket) or a sortable list
- Market links to TCGplayer, eBay sold, PriceCharting; Pokémon price lookup when possible
- JSON + CSV export/import, copy-as-list, backup reminder
- Saves in the browser (IndexedDB). Export if you switch devices.

## Run locally

Needs Node.js 22+.

```bash
npm install
cp .env.example .env   # only if you want Identify
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

**Windows:** if `npm run dev` fails with `spawn vite ENOENT`:

```powershell
node .\node_modules\vite\bin\vite.js dev --host 0.0.0.0 --port 8080
```

Identify needs `XAI_API_KEY` in `.env`. Crop, split, manual add, and Collection work without it.

Do not commit `.env`.
