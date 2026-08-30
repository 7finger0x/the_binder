export const CATEGORIES = ["Sports", "Pokémon", "TCG", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONDITIONS = ["NM", "LP", "MP", "HP", "DMG", "Graded"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABELS: Record<Condition, string> = {
  NM: "Near Mint",
  LP: "Light Play",
  MP: "Moderate Play",
  HP: "Heavy Play",
  DMG: "Damaged",
  Graded: "Graded / slab",
};

export const STATUSES = ["owned", "wishlist"] as const;
export type Status = (typeof STATUSES)[number];

export const TRADE_STATUSES = ["none", "for_trade", "want"] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

export type ValueSnapshot = { at: number; value: number };

export const KINDS = ["single", "sealed"] as const;
export type Kind = (typeof KINDS)[number];

export const SORTS = ["newest", "oldest", "name", "year", "set", "value"] as const;
export type SortKey = (typeof SORTS)[number];

export type Card = {
  id: string;
  name: string;
  team: string;
  year: string;
  brand: string;
  setName: string;
  number: string;
  variant: string;
  category: Category;
  condition: string;
  grade: string;
  value: string;
  notes: string;
  image: string;
  imageBack: string;
  createdAt: number;
  kind: Kind;
  status: Status;
  tradeStatus: TradeStatus;
  valueSnapshots: ValueSnapshot[];
  position: string;
  hp: string;
  rarity: string;
  page: number;
  pocket: number;
  marketSource: string;
  tcgplayerUrl: string;
  ebayUrl: string;
  pricechartingUrl: string;
  comcUrl: string;
  point130Url: string;
  qty: string;
  location: string;
  stack: string;
  updatedAt: number;
};

export type CardDraft = Omit<Card, "id" | "createdAt">;

export const EMPTY_CARD: CardDraft = {
  name: "",
  team: "",
  year: "",
  brand: "",
  setName: "",
  number: "",
  variant: "",
  category: "Sports",
  condition: "",
  grade: "",
  value: "",
  notes: "",
  image: "",
  imageBack: "",
  kind: "single",
  status: "owned",
  tradeStatus: "none",
  valueSnapshots: [],
  position: "",
  hp: "",
  rarity: "",
  page: 0,
  pocket: -1,
  marketSource: "",
  tcgplayerUrl: "",
  ebayUrl: "",
  pricechartingUrl: "",
  comcUrl: "",
  point130Url: "",
  qty: "1",
  location: "",
  stack: "",
  updatedAt: 0,
};

export function uid() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}

export function isCondition(v: string): v is Condition {
  return (CONDITIONS as readonly string[]).includes(v);
}

export function isStatus(v: string): v is Status {
  return (STATUSES as readonly string[]).includes(v);
}

export function isTradeStatus(v: string): v is TradeStatus {
  return (TRADE_STATUSES as readonly string[]).includes(v);
}

export function isKind(v: string): v is Kind {
  return (KINDS as readonly string[]).includes(v);
}

export function isSortKey(v: string): v is SortKey {
  return (SORTS as readonly string[]).includes(v);
}

export function duplicateKey(c: Pick<CardDraft, "name" | "setName" | "number" | "year">) {
  return [c.name, c.setName, c.number, c.year]
    .map((s) => String(s || "").trim().toLowerCase())
    .join("|");
}

export function findDuplicate(cards: Card[], draft: CardDraft, exceptId?: string) {
  const key = duplicateKey(draft);
  if (!draft.name.trim()) return null;
  if (key === "|||") return null;
  return (
    cards.find((c) => c.id !== exceptId && duplicateKey(c) === key && c.name.trim()) || null
  );
}

export function parseValue(v: string) {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function sortCards(cards: Card[], sort: SortKey) {
  const copy = cards.slice();
  copy.sort((a, b) => {
    if (sort === "newest") return (b.createdAt || 0) - (a.createdAt || 0);
    if (sort === "oldest") return (a.createdAt || 0) - (b.createdAt || 0);
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "year") return String(b.year).localeCompare(String(a.year), undefined, { numeric: true });
    if (sort === "set") return `${a.setName} ${a.number}`.localeCompare(`${b.setName} ${b.number}`);
    if (sort === "value") return parseValue(b.value) - parseValue(a.value);
    return 0;
  });
  return copy;
}

export function nextSlot(cards: Card[]): { page: number; pocket: number } {
  const used = new Set(
    cards
      .filter((c) => c.status === "owned" && c.kind === "single" && c.page > 0 && c.pocket >= 0)
      .map((c) => `${c.page}:${c.pocket}`),
  );
  for (let page = 1; page < 1000; page++) {
    for (let pocket = 0; pocket < 9; pocket++) {
      if (!used.has(`${page}:${pocket}`)) return { page, pocket };
    }
  }
  return { page: 1, pocket: 0 };
}

export function normalizeCard(raw: unknown): Card | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const name = String(p.name || "").trim();
  if (!name) return null;
  const cat = String(p.category || "Other");
  const status = String(p.status || "owned");
  const kind = String(p.kind || "single");
  return {
    ...EMPTY_CARD,
    id: String(p.id || uid()),
    createdAt: Number(p.createdAt) || Date.now(),
    name,
    team: String(p.team || ""),
    year: String(p.year || ""),
    brand: String(p.brand || ""),
    setName: String(p.setName || p.set || ""),
    number: String(p.number || p.cardNumber || ""),
    variant: String(p.variant || ""),
    category: isCategory(cat) ? cat : "Other",
    condition: String(p.condition || ""),
    grade: String(p.grade || ""),
    value: String(p.value || p.marketValue || ""),
    notes: String(p.notes || ""),
    image: String(p.image || ""),
    imageBack: String(p.imageBack || ""),
    kind: isKind(kind) ? kind : "single",
    status: isStatus(status) ? status : "owned",
    tradeStatus: isTradeStatus(String(p.tradeStatus || "none"))
      ? (String(p.tradeStatus) as TradeStatus)
      : "none",
    valueSnapshots: Array.isArray(p.valueSnapshots)
      ? p.valueSnapshots
          .map((s) => {
            if (!s || typeof s !== "object") return null;
            const row = s as Record<string, unknown>;
            const value = Number(row.value ?? row.amount);
            const at = Number(row.at);
            if (!Number.isFinite(value) || !Number.isFinite(at)) return null;
            return { at, value };
          })
          .filter((s): s is ValueSnapshot => Boolean(s))
          .slice(-90)
      : [],
    position: String(p.position || ""),
    hp: String(p.hp || ""),
    rarity: String(p.rarity || ""),
    page: Number(p.page) || 0,
    pocket: Number.isFinite(Number(p.pocket)) ? Number(p.pocket) : -1,
    marketSource: String(p.marketSource || ""),
    tcgplayerUrl: String(p.tcgplayerUrl || ""),
    ebayUrl: String(p.ebayUrl || ""),
    pricechartingUrl: String(p.pricechartingUrl || ""),
    comcUrl: String(p.comcUrl || ""),
    point130Url: String(p.point130Url || ""),
    qty: String(p.qty || "1"),
    location: String(p.location || ""),
    stack: String(p.stack || ""),
    updatedAt: Number(p.updatedAt) || Number(p.createdAt) || Date.now(),
  };
}

export function assignMissingSlots(cards: Card[]) {
  const next = cards.slice();
  const placed = next.filter((c) => c.status === "owned" && c.kind === "single" && c.page > 0 && c.pocket >= 0);
  for (const card of next) {
    if (card.status !== "owned" || card.kind !== "single") continue;
    if (card.page > 0 && card.pocket >= 0) continue;
    const slot = nextSlot(placed);
    card.page = slot.page;
    card.pocket = slot.pocket;
    placed.push(card);
  }
  return next;
}

export function marketQuery(c: Pick<CardDraft, "year" | "brand" | "name" | "setName" | "number" | "variant">) {
  return [c.year, c.brand, c.name, c.setName, c.number ? `#${c.number}` : "", c.variant]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" ");
}

export function marketplaceUrls(c: CardDraft) {
  const q = encodeURIComponent(marketQuery(c) || c.name);
  return {
    tcgplayerUrl: `https://www.tcgplayer.com/search/all/product?q=${q}`,
    ebayUrl: `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`,
    pricechartingUrl: `https://www.pricecharting.com/search-products?type=prices&q=${q}`,
    comcUrl: `https://www.comc.com/Cards?q=${q}`,
    point130Url: `https://130point.com/sales/?search=${q}`,
  };
}

export function mergeCardLists(local: Card[], remote: Card[]) {
  const map = new Map<string, Card>();
  for (const c of local) map.set(c.id, c);
  for (const c of remote) {
    const cur = map.get(c.id);
    if (!cur || (c.updatedAt || 0) >= (cur.updatedAt || 0)) map.set(c.id, c);
  }
  return Array.from(map.values());
}

function cardSyncFingerprint(c: Card) {
  return [c.name, c.value, c.condition, c.notes, c.status, c.stack, c.setName, c.number].join("|");
}

export type SyncConflict = { local: Card; remote: Card };

/** Cards edited on both devices with different data. */
export function findSyncConflicts(local: Card[], remote: Card[]): SyncConflict[] {
  const remoteMap = new Map(remote.map((c) => [c.id, c]));
  const conflicts: SyncConflict[] = [];
  for (const l of local) {
    if (l.id.startsWith("sample-")) continue;
    const r = remoteMap.get(l.id);
    if (!r) continue;
    if (cardSyncFingerprint(l) === cardSyncFingerprint(r)) continue;
    conflicts.push({ local: l, remote: r });
  }
  return conflicts;
}

export function resolveSyncConflicts(
  local: Card[],
  remote: Card[],
  picks: Record<string, "local" | "remote">,
) {
  const remoteMap = new Map(remote.map((c) => [c.id, c]));
  const localMap = new Map(local.map((c) => [c.id, c]));
  const ids = new Set([...localMap.keys(), ...remoteMap.keys()]);
  const merged: Card[] = [];
  for (const id of ids) {
    const pick = picks[id];
    if (pick === "local" && localMap.has(id)) merged.push(localMap.get(id)!);
    else if (pick === "remote" && remoteMap.has(id)) merged.push(remoteMap.get(id)!);
    else {
      const l = localMap.get(id);
      const r = remoteMap.get(id);
      if (l && r) merged.push((l.updatedAt || 0) >= (r.updatedAt || 0) ? l : r);
      else merged.push(l || r!);
    }
  }
  return merged;
}

export function toCsv(cards: Card[]) {
  const headers = [
    "name",
    "team",
    "position",
    "year",
    "brand",
    "set",
    "number",
    "variant",
    "category",
    "kind",
    "status",
    "condition",
    "grade",
    "hp",
    "rarity",
    "value",
    "qty",
    "location",
    "stack",
    "page",
    "pocket",
    "notes",
    "tcgplayer",
    "ebay",
    "pricecharting",
    "comc",
    "130point",
  ];
  const lines = [headers.join(",")];
  for (const c of cards) {
    const row = [
      c.name,
      c.team,
      c.position,
      c.year,
      c.brand,
      c.setName,
      c.number,
      c.variant,
      c.category,
      c.kind,
      c.status,
      c.condition,
      c.grade,
      c.hp,
      c.rarity,
      c.value,
      c.qty,
      c.location,
      c.stack,
      c.page || "",
      c.pocket >= 0 ? String(c.pocket + 1) : "",
      c.notes,
      c.tcgplayerUrl,
      c.ebayUrl,
      c.pricechartingUrl,
      c.comcUrl,
      c.point130Url,
    ].map(csvCell);
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

function csvCell(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
