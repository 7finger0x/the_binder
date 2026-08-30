# The Card Binder

Catalog sports, Pokémon, and TCG cards from a photo of a binder page.

- Scan a sleeve, **split into 9 pockets**, crop one card, or identify the page
- Review/edit before saving — duplicate warnings included
- Sports vs TCG fields, condition picker, singles vs sealed, owned vs wishlist
- Collection as real 9-pocket pages (move via page/pocket) or a sortable list
- **Honest pricing**: sold comps drawer, condition-adjusted portfolio totals, real price history
- Master set tracking with completion % and cost-to-complete (Pokémon SV1 catalog)
- Public showcase at `/c/[slug]` with trade/want lists — **share link is free**
- JSON + CSV export (Pro), cloud sync when signed in
- Saves in the browser (IndexedDB)

## Pro ($5.99/mo)

- Unlimited cards (free: 500)
- Bulk price refresh
- Stacks view
- Printable set checklists
- CSV / JSON export
- Stripe subscription with 14-day trial

## Run locally

Needs Node.js 22+.

```bash
npm install
cp .env.example .env   # optional: Identify, Stripe, eBay comps
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

**Windows:** if `npm run dev` fails with `spawn vite ENOENT`:

```powershell
node .\node_modules\vite\bin\vite.js dev --host 0.0.0.0 --port 8080
```

### Environment variables

| Variable | Purpose |
|----------|---------|
| `XAI_API_KEY` | Page/card identify (xAI vision) |
| `DATABASE_URL` | Cloud sync + showcase (Neon Postgres) |
| `STRIPE_SECRET_KEY` | Pro billing |
| `STRIPE_PRO_PRICE_ID` | Pro subscription price |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `EBAY_APP_ID` | eBay sold comps (Finding API) |

Do not commit `.env`.
