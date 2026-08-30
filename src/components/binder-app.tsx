import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  FolderOpen,
  Download,
  Upload,
  Search,
  Trash2,
  X,
  ExternalLink,
  Grid3x3,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  assignMissingSlots,
  CATEGORIES,
  EMPTY_CARD,
  findDuplicate,
  marketplaceUrls,
  nextSlot,
  normalizeCard,
  sortCards,
  toCsv,
  uid,
  type Card,
  type CardDraft,
  type Category,
  type SortKey,
} from "@/lib/cards";
import { compressFull, cropToJpeg, splitNine } from "@/lib/image";
import { deleteCard, loadCards, putCard, putMany } from "@/lib/idb";
import { identifyPage } from "@/lib/identify";
import { lookupMarket } from "@/lib/market";
import { CardForm } from "./card-form";

type Tab = "scan" | "collection";
type Filter = "All" | Category;
type StatusFilter = "all" | "owned" | "wishlist";
type KindFilter = "all" | "single" | "sealed";
type CollectionView = "binder" | "list";

const BACKUP_KEY = "the-binder-last-export";

const SAMPLE: Card[] = assignMissingSlots([
  {
    ...EMPTY_CARD,
    id: "sample-jrod",
    name: "Julio Rodríguez",
    team: "Mariners",
    position: "OF",
    year: "2023",
    brand: "Topps",
    setName: "Chrome",
    number: "1",
    variant: "Refractor",
    category: "Sports",
    notes: "Sample card — delete anytime.",
    createdAt: Date.now() - 3,
  },
  {
    ...EMPTY_CARD,
    id: "sample-charizard",
    name: "Charizard",
    year: "1999",
    brand: "Wizards of the Coast",
    setName: "Base Set",
    number: "4",
    variant: "Holo",
    category: "Pokémon",
    rarity: "Holo Rare",
    hp: "120",
    notes: "Sample card — delete anytime.",
    createdAt: Date.now() - 2,
  },
  {
    ...EMPTY_CARD,
    id: "sample-blueeyes",
    name: "Blue-Eyes White Dragon",
    year: "2002",
    brand: "Konami",
    setName: "Legend of Blue Eyes",
    number: "LOB-001",
    variant: "Ultra Rare",
    category: "TCG",
    rarity: "Ultra Rare",
    notes: "Sample card — delete anytime.",
    createdAt: Date.now() - 1,
  },
] as Card[]);

export function BinderApp() {
  const [ready, setReady] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [tab, setTab] = useState<Tab>("scan");
  const [filter, setFilter] = useState<Filter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<CollectionView>("binder");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<Card | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [scanError, setScanError] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoReady, setPhotoReady] = useState(0);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [review, setReview] = useState<CardDraft[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [manual, setManual] = useState<CardDraft>({ ...EMPTY_CARD });
  const [lastExport, setLastExport] = useState<number>(() => {
    const n = Number(localStorage.getItem(BACKUP_KEY) || 0);
    return Number.isFinite(n) ? n : 0;
  });
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCards()
      .then(async (rows) => {
        if (!rows.length) {
          await putMany(SAMPLE);
          setCards(SAMPLE);
        } else {
          const placed = assignMissingSlots(rows);
          const dirty = placed.filter((c, i) => c.page !== rows[i]?.page || c.pocket !== rows[i]?.pocket);
          if (dirty.length) await putMany(placed);
          setCards(placed);
        }
      })
      .catch(() => setCards(SAMPLE))
      .finally(() => setReady(true));
  }, []);

  function ping(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }

  async function persist(card: Card, rest = cards) {
    const occupant = rest.find(
      (c) =>
        c.id !== card.id &&
        card.status === "owned" &&
        card.kind === "single" &&
        c.status === "owned" &&
        c.kind === "single" &&
        c.page === card.page &&
        c.pocket === card.pocket &&
        card.page > 0 &&
        card.pocket >= 0,
    );
    const writes = [card];
    if (occupant) {
      const prev = rest.find((c) => c.id === card.id);
      writes.push({
        ...occupant,
        page: prev?.page || 0,
        pocket: prev?.pocket ?? -1,
      });
    }
    await putMany(writes);
    setCards((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      writes.forEach((c) => map.set(c.id, c));
      return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
    });
  }

  async function addDraft(draft: CardDraft) {
    let next: Card = { ...draft, id: uid(), createdAt: Date.now() };
    if (next.status === "owned" && next.kind === "single" && (next.page <= 0 || next.pocket < 0)) {
      next = { ...next, ...nextSlot(cards) };
    }
    await persist(next);
    return next;
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = cards.filter((c) => {
      if (filter !== "All" && c.category !== filter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (kindFilter !== "all" && c.kind !== kindFilter) return false;
      if (!q) return true;
      return [
        c.name,
        c.team,
        c.year,
        c.brand,
        c.setName,
        c.number,
        c.variant,
        c.notes,
        c.position,
        c.rarity,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return sortCards(filtered, sort);
  }, [cards, filter, query, statusFilter, kindFilter, sort]);

  const binderPages = useMemo(() => {
    const owned = shown.filter((c) => c.status === "owned" && c.kind === "single");
    const maxPage = Math.max(1, ...owned.map((c) => c.page || 1));
    return Array.from({ length: maxPage }, (_, i) => {
      const page = i + 1;
      const slots: (Card | null)[] = Array.from({ length: 9 }, () => null);
      owned.forEach((c) => {
        if (c.page === page && c.pocket >= 0 && c.pocket < 9) slots[c.pocket] = c;
      });
      return slots;
    });
  }, [shown]);

  const needBackup = cards.length >= 3 && Date.now() - lastExport > 1000 * 60 * 60 * 24 * 3;

  function onFile(file: File | undefined) {
    setScanError("");
    if (!file) return;
    const ok =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!ok) {
      setScanError("That file doesn’t look like a photo of cards.");
      return;
    }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoReady(0);
    setCrop(null);
  }

  function overlayPoint(e: React.PointerEvent) {
    const img = imgRef.current;
    if (!img) return null;
    const scale = Math.min(img.clientWidth / img.naturalWidth, img.clientHeight / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const ox = (img.clientWidth - dw) / 2;
    const oy = (img.clientHeight - dh) / 2;
    const x = Math.min(dw, Math.max(0, e.clientX - img.getBoundingClientRect().left - ox));
    const y = Math.min(dh, Math.max(0, e.clientY - img.getBoundingClientRect().top - oy));
    return { x, y, scale, ox, oy };
  }

  function finishCrop() {
    const img = imgRef.current;
    if (!img || !crop || crop.w < 8 || crop.h < 8) {
      ping("Draw a larger box around one card");
      return;
    }
    const scale = Math.min(img.clientWidth / img.naturalWidth, img.clientHeight / img.naturalHeight);
    const data = cropToJpeg(img, {
      x: crop.x / scale,
      y: crop.y / scale,
      w: crop.w / scale,
      h: crop.h / scale,
    });
    const draft: CardDraft = { ...EMPTY_CARD, image: data };
    setReview((prev) => [...prev, draft]);
    setReviewIndex(review.length);
    setCrop(null);
  }

  function splitPage() {
    const img = imgRef.current;
    if (!img) return;
    const images = splitNine(img).filter(Boolean);
    const drafts = images.map((image) => ({ ...EMPTY_CARD, image }));
    setReview(drafts);
    setReviewIndex(0);
    ping("9 pockets ready — tag each card");
  }

  const currentReview = review[reviewIndex] || null;
  const reviewDup = currentReview ? findDuplicate(cards, currentReview) : null;

  function patchReview(next: CardDraft) {
    setReview((prev) => prev.map((d, i) => (i === reviewIndex ? next : d)));
  }

  async function saveReviewOne() {
    if (!currentReview?.name.trim()) {
      ping("Add at least a name");
      return;
    }
    await addDraft(currentReview);
    ping("Added to binder");
    const remaining = review.filter((_, i) => i !== reviewIndex);
    setReview(remaining);
    setReviewIndex(Math.min(reviewIndex, Math.max(0, remaining.length - 1)));
  }

  async function saveReviewAll() {
    const named = review.filter((d) => d.name.trim());
    if (!named.length) {
      ping("Name the cards you want to add");
      return;
    }
    const added: Card[] = [];
    let pool = cards;
    for (const draft of named) {
      let next: Card = { ...draft, id: uid(), createdAt: Date.now() };
      if (next.status === "owned" && next.kind === "single" && (next.page <= 0 || next.pocket < 0)) {
        next = { ...next, ...nextSlot(pool) };
      }
      pool = [next, ...pool];
      added.push(next);
    }
    await putMany(added);
    setCards(pool);
    setReview([]);
    ping(`Added ${added.length} card${added.length === 1 ? "" : "s"}`);
    setTab("collection");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveManual() {
    if (!manual.name.trim()) {
      ping("Add at least a name");
      return;
    }
    await addDraft(manual);
    ping("Added to binder");
    setManual({ ...EMPTY_CARD });
    setTab("collection");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function runIdentify() {
    const img = imgRef.current;
    if (!img) return;
    setIdentifying(true);
    setScanError("");
    try {
      const image = compressFull(img, 1280, 0.72);
      const result = await identifyPage({ data: { image } });
      if (!result.ok) {
        setScanError(result.error);
        return;
      }
      const pocketImages = review.length ? review.map((d) => d.image) : splitNine(img);
      const drafts: CardDraft[] = result.cards.map((c, i) => ({
        ...EMPTY_CARD,
        ...c,
        image: pocketImages[i] || "",
        ...marketplaceUrls({ ...EMPTY_CARD, ...c }),
      }));
      if (pocketImages.length > drafts.length) {
        for (let i = drafts.length; i < pocketImages.length; i++) {
          if (pocketImages[i]) drafts.push({ ...EMPTY_CARD, image: pocketImages[i] });
        }
      }
      setReview(drafts);
      setReviewIndex(0);
      ping(`Review ${result.cards.length} identified card${result.cards.length === 1 ? "" : "s"}`);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Identify failed.");
    } finally {
      setIdentifying(false);
    }
  }

  async function priceDraft(draft: CardDraft, apply: (next: CardDraft) => void) {
    setPricing(true);
    try {
      const result = await lookupMarket({ data: draft });
      apply({
        ...draft,
        value: result.value || draft.value,
        marketSource: result.source || draft.marketSource,
        tcgplayerUrl: result.tcgplayerUrl,
        ebayUrl: result.ebayUrl,
        pricechartingUrl: result.pricechartingUrl,
      });
      ping(result.value ? `Market ${result.value}` : "Marketplace links added — value left for you");
    } catch {
      apply({ ...draft, ...marketplaceUrls(draft) });
      ping("Marketplace links added");
    } finally {
      setPricing(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    let next = editing;
    if (next.status === "owned" && next.kind === "single" && (next.page <= 0 || next.pocket < 0)) {
      next = { ...next, ...nextSlot(cards.filter((c) => c.id !== next.id)) };
    }
    await persist(next);
    setEditing(null);
    ping("Saved");
  }

  async function remove(id: string) {
    await deleteCard(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setEditing(null);
    setConfirmId(null);
    ping("Deleted");
  }

  function markExported() {
    const now = Date.now();
    localStorage.setItem(BACKUP_KEY, String(now));
    setLastExport(now);
  }

  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), cards }, null, 2)],
      { type: "application/json" },
    );
    downloadBlob(blob, "the-card-binder-collection.json");
    markExported();
    ping("JSON backup downloaded");
  }

  function exportCsv() {
    const blob = new Blob([toCsv(cards)], { type: "text/csv" });
    downloadBlob(blob, "the-card-binder-collection.csv");
    markExported();
    ping("CSV downloaded");
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result));
        const incoming = Array.isArray(data) ? data : data.cards || [];
        const have = new Map(cards.map((c) => [c.id, c]));
        const writes: Card[] = [];
        incoming.forEach((raw: unknown) => {
          const next = normalizeCard(raw);
          if (!next) return;
          have.set(next.id, next);
          writes.push(next);
        });
        const placed = assignMissingSlots(Array.from(have.values()));
        await putMany(placed);
        setCards(placed.sort((a, b) => b.createdAt - a.createdAt));
        ping("Imported collection");
      } catch {
        ping("Couldn’t read that file");
      }
    };
    reader.readAsText(file);
  }

  function copyShare() {
    const lines = shown.map((c) => {
      const bits = [c.name, c.year, c.setName, c.number ? `#${c.number}` : "", c.value].filter(Boolean);
      return `• ${bits.join(" · ")}`;
    });
    const text = `The Card Binder (${shown.length})\n${lines.join("\n")}`;
    void navigator.clipboard.writeText(text).then(
      () => ping("Collection list copied"),
      () => ping("Couldn’t copy"),
    );
  }

  const manualDup = findDuplicate(cards, manual);
  const editDup = editing ? findDuplicate(cards, editing, editing.id) : null;

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="h-8 w-40 rounded-sm bg-raised" />
        <div className="mt-6 h-64 rounded-lg border border-line bg-panel" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-16">
      <header className="sticky top-0 z-20 -mx-4 mb-4 flex items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <h1 className="flex-1 font-display text-xl font-semibold tracking-tight">
          The Card <span className="text-accent-2">Binder</span>
        </h1>
      </header>

      <div className="sticky top-14 z-20 mb-5 grid grid-cols-2 gap-2 bg-bg py-2">
        {(["scan", "collection"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={cn(
              "h-11 rounded-md border text-sm font-semibold capitalize",
              tab === id ? "border-accent bg-raised text-ink" : "border-line bg-panel text-muted",
            )}
          >
            {id === "scan" ? "Scan" : "Collection"}
          </button>
        ))}
      </div>

      {needBackup && tab === "collection" ? (
        <div className="mb-4 rounded-md border border-accent/40 bg-raised px-4 py-3 text-sm">
          Collection lives in this browser. Export a backup so you don’t lose it.
          <button type="button" className="ml-2 font-semibold text-accent-2" onClick={exportJson}>
            Export JSON
          </button>
        </div>
      ) : null}

      {tab === "scan" ? (
        <div className="space-y-5">
          <section className="rounded-lg border border-line bg-panel p-4 sm:p-5">
            <h2 className="font-display text-lg">Scan a page</h2>
            <p className="mt-1 mb-4 text-sm leading-relaxed text-muted">
              Photo a 9-pocket sleeve. Split it into nine cards, identify the page, or drag a box around one card.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-ink"
              >
                <Camera className="size-4" /> Take a photo
              </button>
              <button
                type="button"
                onClick={() => libraryRef.current?.click()}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-raised px-4 text-sm font-semibold"
              >
                <FolderOpen className="size-4" /> Choose from library
              </button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <input
              ref={libraryRef}
              type="file"
              accept="*/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />

            {photoUrl ? (
              <>
                <div className="relative mt-4 overflow-hidden rounded-md bg-pocket">
                  <img
                    ref={imgRef}
                    src={photoUrl}
                    alt="Binder page"
                    onLoad={() => setPhotoReady((n) => n + 1)}
                    className="mx-auto block max-h-[70vh] w-full object-contain"
                    onPointerDown={(e) => {
                      const p = overlayPoint(e);
                      if (!p) return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      dragRef.current = { x: p.x, y: p.y };
                      setCrop({ x: p.x, y: p.y, w: 0, h: 0 });
                    }}
                    onPointerMove={(e) => {
                      if (!dragRef.current) return;
                      const p = overlayPoint(e);
                      if (!p) return;
                      const a = dragRef.current;
                      setCrop({
                        x: Math.min(a.x, p.x),
                        y: Math.min(a.y, p.y),
                        w: Math.abs(a.x - p.x),
                        h: Math.abs(a.y - p.y),
                      });
                    }}
                    onPointerUp={() => {
                      dragRef.current = null;
                      finishCrop();
                    }}
                  />
                  {crop ? (
                    <CropBox crop={crop} img={imgRef.current} />
                  ) : photoReady ? (
                    <NineGuide img={imgRef.current} />
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted">Drag to box one card, or split the whole sleeve.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={splitPage}
                    className="h-11 rounded-md border border-line bg-raised px-4 text-sm font-semibold"
                  >
                    Split into 9 pockets
                  </button>
                  <button
                    type="button"
                    disabled={identifying}
                    onClick={runIdentify}
                    className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-50"
                  >
                    {identifying ? "Identifying…" : "Identify cards on this page"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl(null);
                      setCrop(null);
                    }}
                    className="h-11 rounded-md border border-line px-4 text-sm font-semibold"
                  >
                    Clear photo
                  </button>
                </div>
              </>
            ) : null}
            {scanError ? <p className="mt-3 text-sm text-danger">{scanError}</p> : null}
          </section>

          {currentReview ? (
            <section className="rounded-lg border border-line bg-panel p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-lg">
                  Review {reviewIndex + 1} of {review.length}
                </h2>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="grid size-11 place-items-center rounded-md border border-line"
                    disabled={reviewIndex === 0}
                    onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="grid size-11 place-items-center rounded-md border border-line"
                    disabled={reviewIndex >= review.length - 1}
                    onClick={() => setReviewIndex((i) => Math.min(review.length - 1, i + 1))}
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
              {currentReview.image ? (
                <img src={currentReview.image} alt="" className="mb-3 h-36 rounded-sm object-contain" />
              ) : null}
              {reviewDup ? (
                <p className="mb-3 rounded-sm bg-raised px-3 py-2 text-sm text-accent-2">
                  Looks like a duplicate of {reviewDup.name}
                  {reviewDup.number ? ` #${reviewDup.number}` : ""}. Add anyway or skip.
                </p>
              ) : null}
              <CardForm values={currentReview} onChange={patchReview} />
              <MarketLinks card={currentReview} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveReviewOne}
                  className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-ink"
                >
                  Add this card
                </button>
                <button
                  type="button"
                  disabled={pricing}
                  onClick={() => currentReview && priceDraft(currentReview, patchReview)}
                  className="h-11 rounded-md border border-line px-4 text-sm font-semibold"
                >
                  {pricing ? "Looking up…" : "Lookup price"}
                </button>
                <button
                  type="button"
                  onClick={saveReviewAll}
                  className="h-11 rounded-md border border-line px-4 text-sm font-semibold"
                >
                  Add all named
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const remaining = review.filter((_, i) => i !== reviewIndex);
                    setReview(remaining);
                    setReviewIndex(Math.min(reviewIndex, Math.max(0, remaining.length - 1)));
                  }}
                  className="h-11 px-3 text-sm font-semibold text-accent-2"
                >
                  Skip
                </button>
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-line bg-panel p-4 sm:p-5">
            <h2 className="font-display text-lg">Add a card manually</h2>
            <p className="mt-1 mb-4 text-sm text-muted">No photo needed. Use this for singles or sealed product.</p>
            {manualDup ? (
              <p className="mb-3 rounded-sm bg-raised px-3 py-2 text-sm text-accent-2">
                You already have {manualDup.name}
                {manualDup.number ? ` #${manualDup.number}` : ""}.
              </p>
            ) : null}
            <CardForm values={manual} onChange={setManual} />
            <MarketLinks card={manual} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveManual}
                className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-ink"
              >
                Add to binder
              </button>
              <button
                type="button"
                disabled={pricing}
                onClick={() => priceDraft(manual, setManual)}
                className="h-11 rounded-md border border-line px-4 text-sm font-semibold"
              >
                {pricing ? "Looking up…" : "Lookup price"}
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center gap-2 rounded-md border border-line bg-panel px-3">
            <Search className="size-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, set, team, year…"
              className="h-11 flex-1 bg-transparent outline-none placeholder:text-muted"
            />
          </div>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {(["All", ...CATEGORIES] as Filter[]).map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </Chip>
            ))}
          </div>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              All status
            </Chip>
            <Chip active={statusFilter === "owned"} onClick={() => setStatusFilter("owned")}>
              Owned
            </Chip>
            <Chip active={statusFilter === "wishlist"} onClick={() => setStatusFilter("wishlist")}>
              Wishlist
            </Chip>
            <Chip active={kindFilter === "all"} onClick={() => setKindFilter("all")}>
              All kinds
            </Chip>
            <Chip active={kindFilter === "single"} onClick={() => setKindFilter("single")}>
              Singles
            </Chip>
            <Chip active={kindFilter === "sealed"} onClick={() => setKindFilter("sealed")}>
              Sealed
            </Chip>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setView("binder")}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold",
                view === "binder" ? "border-accent bg-raised" : "border-line bg-panel",
              )}
            >
              <Grid3x3 className="size-4" /> Binder
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold",
                view === "list" ? "border-accent bg-raised" : "border-line bg-panel",
              )}
            >
              <List className="size-4" /> List
            </button>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortKey);
                setView("list");
              }}
              className="h-11 rounded-md border border-line bg-panel px-3 text-sm font-semibold"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
              <option value="year">Year</option>
              <option value="set">Set</option>
              <option value="value">Value</option>
            </select>
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-panel px-3 text-sm font-semibold"
            >
              <Download className="size-4" /> JSON
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-panel px-3 text-sm font-semibold"
            >
              <Download className="size-4" /> CSV
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-panel px-3 text-sm font-semibold"
            >
              <Upload className="size-4" /> Import
            </button>
            <button
              type="button"
              onClick={copyShare}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-panel px-3 text-sm font-semibold"
            >
              Copy list
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="mb-3 text-sm text-muted">
            {shown.length} card{shown.length === 1 ? "" : "s"}
            {shown.length !== cards.length ? ` of ${cards.length}` : ""}
          </p>
          {shown.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
              Nothing here yet. Scan a page or add a card manually.
            </p>
          ) : view === "binder" ? (
            <div className="space-y-4">
              {binderPages.map((slots, i) => (
                <div key={i} className="rounded-lg border border-line bg-panel p-3">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Page {i + 1}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((c, p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={!c}
                        onClick={() => c && setEditing(c)}
                        className={cn(
                          "min-h-28 rounded-sm border border-line bg-pocket p-2 text-left",
                          !c && "opacity-30",
                        )}
                      >
                        {c?.image ? (
                          <img src={c.image} alt="" className="mb-1 h-16 w-full rounded-sm object-cover" />
                        ) : null}
                        <p className="text-xs font-bold leading-snug">{c?.name || ""}</p>
                        <p className="text-xs text-muted">
                          {c
                            ? [c.year, c.brand, c.number ? `#${c.number}` : "", c.value]
                                .filter(Boolean)
                                .join(" · ")
                            : `Pocket ${p + 1}`}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {shown.some((c) => c.kind === "sealed" && c.status === "owned") ? (
                <SealedBlock
                  cards={shown.filter((c) => c.kind === "sealed" && c.status === "owned")}
                  onOpen={setEditing}
                />
              ) : null}
              {shown.some((c) => c.status === "wishlist") ? (
                <ListBlock
                  title="Wishlist"
                  cards={shown.filter((c) => c.status === "wishlist")}
                  onOpen={setEditing}
                />
              ) : null}
            </div>
          ) : (
            <ListBlock title="List" cards={shown} onOpen={setEditing} />
          )}
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 p-0 sm:items-center sm:p-6">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-auto rounded-t-lg border border-line bg-panel p-5 sm:rounded-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg">Edit card</h2>
              <button type="button" className="grid size-11 place-items-center" onClick={() => setEditing(null)}>
                <X className="size-5" />
              </button>
            </div>
            {editing.image ? (
              <img src={editing.image} alt="" className="mb-3 h-40 rounded-sm object-cover" />
            ) : null}
            {editDup ? (
              <p className="mb-3 rounded-sm bg-raised px-3 py-2 text-sm text-accent-2">
                Duplicate of {editDup.name} already in the binder.
              </p>
            ) : null}
            <CardForm values={editing} onChange={(v) => setEditing({ ...editing, ...v })} />
            <MarketLinks card={editing} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveEdit}
                className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-ink"
              >
                Save
              </button>
              <button
                type="button"
                disabled={pricing}
                onClick={() => editing && priceDraft(editing, (v) => setEditing({ ...editing, ...v }))}
                className="h-11 rounded-md border border-line px-4 text-sm font-semibold"
              >
                {pricing ? "Looking up…" : "Lookup price"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmId(editing.id)}
                className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-danger"
              >
                <Trash2 className="size-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-6">
          <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-5">
            <h2 className="font-display text-lg">Delete this card?</h2>
            <p className="mt-2 text-sm text-muted">This can’t be undone.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => remove(confirmId)}
                className="h-11 rounded-md bg-danger px-4 text-sm font-semibold text-ink"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="h-11 rounded-md border border-line px-4 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed right-4 bottom-4 left-4 z-50 rounded-md border border-line bg-raised px-4 py-3 text-sm sm:left-auto sm:w-80">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 shrink-0 rounded-full px-3 text-sm font-medium",
        active ? "bg-raised text-ink ring-1 ring-accent" : "bg-panel text-muted",
      )}
    >
      {children}
    </button>
  );
}

function MarketLinks({ card }: { card: CardDraft }) {
  const generated = marketplaceUrls(card);
  const urls = {
    tcgplayerUrl: card.tcgplayerUrl || generated.tcgplayerUrl,
    ebayUrl: card.ebayUrl || generated.ebayUrl,
    pricechartingUrl: card.pricechartingUrl || generated.pricechartingUrl,
  };
  if (!card.name.trim()) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-sm">
      {card.marketSource ? <span className="text-muted">{card.marketSource}</span> : null}
      <a className="inline-flex items-center gap-1 text-accent-2" href={urls.tcgplayerUrl} target="_blank" rel="noreferrer">
        TCGplayer <ExternalLink className="size-3" />
      </a>
      <a className="inline-flex items-center gap-1 text-accent-2" href={urls.ebayUrl} target="_blank" rel="noreferrer">
        eBay sold <ExternalLink className="size-3" />
      </a>
      <a
        className="inline-flex items-center gap-1 text-accent-2"
        href={urls.pricechartingUrl}
        target="_blank"
        rel="noreferrer"
      >
        PriceCharting <ExternalLink className="size-3" />
      </a>
    </div>
  );
}

function ListBlock({
  title,
  cards,
  onOpen,
}: {
  title: string;
  cards: Card[];
  onOpen: (c: Card) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{title}</p>
      <div className="space-y-2">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onOpen(c)}
            className="flex w-full items-center gap-3 rounded-sm border border-line bg-pocket p-2 text-left"
          >
            {c.image ? (
              <img src={c.image} alt="" className="h-14 w-10 shrink-0 rounded-sm object-cover" />
            ) : (
              <div className="h-14 w-10 shrink-0 rounded-sm bg-raised" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{c.name}</p>
              <p className="truncate text-xs text-muted">
                {[c.year, c.setName, c.number ? `#${c.number}` : "", c.condition, c.value]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SealedBlock({ cards, onOpen }: { cards: Card[]; onOpen: (c: Card) => void }) {
  return <ListBlock title="Sealed product" cards={cards} onOpen={onOpen} />;
}

function containMetrics(img: HTMLImageElement) {
  const scale = Math.min(img.clientWidth / img.naturalWidth, img.clientHeight / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  return {
    scale,
    ox: (img.clientWidth - dw) / 2,
    oy: (img.clientHeight - dh) / 2,
  };
}

function CropBox({
  crop,
  img,
}: {
  crop: { x: number; y: number; w: number; h: number };
  img: HTMLImageElement | null;
}) {
  if (!img) return null;
  const { ox, oy } = containMetrics(img);
  return (
    <div
      className="pointer-events-none absolute border-2 border-accent-2 bg-accent/20"
      style={{ left: crop.x + ox, top: crop.y + oy, width: crop.w, height: crop.h }}
    />
  );
}

function NineGuide({ img }: { img: HTMLImageElement | null }) {
  if (!img?.naturalWidth) return null;
  const { scale, ox, oy } = containMetrics(img);
  return (
    <div
      className="pointer-events-none absolute grid grid-cols-3 grid-rows-3"
      style={{
        left: ox + img.naturalWidth * 0.03 * scale,
        top: oy + img.naturalHeight * 0.03 * scale,
        width: img.naturalWidth * 0.94 * scale,
        height: img.naturalHeight * 0.94 * scale,
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="border border-accent/35" />
      ))}
    </div>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
