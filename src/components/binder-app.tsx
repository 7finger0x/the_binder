import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  FolderOpen,
  Download,
  Upload,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  EMPTY_CARD,
  uid,
  type Card,
  type Category,
} from "@/lib/cards";
import { deleteCard, loadCards, putCard, putMany } from "@/lib/idb";
import { identifyPage } from "@/lib/identify";
import { CardForm } from "./card-form";

type Tab = "scan" | "collection";
type Filter = "All" | Category;

const SAMPLE: Card[] = [
  {
    id: "sample-jrod",
    name: "Julio Rodríguez",
    team: "Mariners",
    year: "2023",
    brand: "Topps",
    setName: "Chrome",
    number: "1",
    variant: "Refractor",
    category: "Sports",
    condition: "",
    value: "",
    notes: "Sample card — delete anytime.",
    image: "",
    createdAt: Date.now() - 3,
  },
  {
    id: "sample-charizard",
    name: "Charizard",
    team: "",
    year: "1999",
    brand: "Wizards of the Coast",
    setName: "Base Set",
    number: "4",
    variant: "Holo",
    category: "Pokémon",
    condition: "",
    value: "",
    notes: "Sample card — delete anytime.",
    image: "",
    createdAt: Date.now() - 2,
  },
  {
    id: "sample-blueeyes",
    name: "Blue-Eyes White Dragon",
    team: "",
    year: "2002",
    brand: "Konami",
    setName: "Legend of Blue Eyes",
    number: "LOB-001",
    variant: "Ultra Rare",
    category: "TCG",
    condition: "",
    value: "",
    notes: "Sample card — delete anytime.",
    image: "",
    createdAt: Date.now() - 1,
  },
];

export function BinderApp() {
  const [ready, setReady] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [tab, setTab] = useState<Tab>("scan");
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<Card | null>(null);
  const [scanError, setScanError] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropForm, setCropForm] = useState<Omit<Card, "id" | "createdAt"> | null>(null);
  const [cropPreview, setCropPreview] = useState("");
  const [manual, setManual] = useState({ ...EMPTY_CARD });
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
          setCards(rows);
        }
      })
      .catch(() => setCards(SAMPLE))
      .finally(() => setReady(true));
  }, []);

  function ping(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function add(card: Card) {
    await putCard(card);
    setCards((prev) => [card, ...prev.filter((c) => c.id !== card.id)]);
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (filter !== "All" && c.category !== filter) return false;
      if (!q) return true;
      return [c.name, c.team, c.year, c.brand, c.setName, c.number, c.variant, c.notes]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [cards, filter, query]);

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
    setCrop(null);
    setCropForm(null);
  }

  function overlayPoint(e: React.PointerEvent) {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const ox = (rect.width - dw) / 2;
    const oy = (rect.height - dh) / 2;
    const x = Math.min(dw, Math.max(0, e.clientX - rect.left - ox));
    const y = Math.min(dh, Math.max(0, e.clientY - rect.top - oy));
    return { x, y, dw, dh, ox, oy, scale };
  }

  function finishCrop() {
    const img = imgRef.current;
    if (!img || !crop || crop.w < 8 || crop.h < 8) {
      ping("Draw a larger box around one card");
      return;
    }
    const scale = Math.min(img.clientWidth / img.naturalWidth, img.clientHeight / img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(crop.w / scale));
    canvas.height = Math.max(1, Math.round(crop.h / scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      img,
      crop.x / scale,
      crop.y / scale,
      crop.w / scale,
      crop.h / scale,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const data = canvas.toDataURL("image/jpeg", 0.82);
    setCropPreview(data);
    setCropForm({ ...EMPTY_CARD, image: data });
  }

  async function saveCropped() {
    if (!cropForm?.name.trim()) {
      ping("Add at least a name");
      return;
    }
    const card: Card = { ...cropForm, id: uid(), createdAt: Date.now() };
    await add(card);
    ping("Added to binder");
    setCropForm(null);
    setCrop(null);
  }

  async function saveManual() {
    if (!manual.name.trim()) {
      ping("Add at least a name");
      return;
    }
    await add({ ...manual, id: uid(), createdAt: Date.now() });
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
      const canvas = document.createElement("canvas");
      const maxW = 1280;
      const scale = Math.min(1, maxW / img.naturalWidth);
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.72);
      const result = await identifyPage({ data: { image } });
      if (!result.ok) {
        setScanError(result.error);
        return;
      }
      const added: Card[] = result.cards.map((c) => ({
        ...EMPTY_CARD,
        ...c,
        id: uid(),
        createdAt: Date.now(),
      }));
      await putMany(added);
      setCards((prev) => [...added, ...prev]);
      ping(`Added ${added.length} card${added.length === 1 ? "" : "s"}`);
      setTab("collection");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Identify failed.");
    } finally {
      setIdentifying(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    await putCard(editing);
    setCards((prev) => prev.map((c) => (c.id === editing.id ? editing : c)));
    setEditing(null);
    ping("Saved");
  }

  async function remove(id: string) {
    await deleteCard(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setEditing(null);
    ping("Deleted");
  }

  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), cards }, null, 2)],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "the-binder-collection.json";
    a.click();
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result));
        const incoming: Card[] = Array.isArray(data) ? data : data.cards || [];
        const have = new Map(cards.map((c) => [c.id, c]));
        const writes: Card[] = [];
        incoming.forEach((c) => {
          if (!c || typeof c !== "object") return;
          const next = { ...EMPTY_CARD, ...c, id: c.id || uid(), createdAt: c.createdAt || Date.now() };
          have.set(next.id, next);
          writes.push(next);
        });
        await putMany(writes);
        setCards(Array.from(have.values()).sort((a, b) => b.createdAt - a.createdAt));
        ping("Imported collection");
      } catch {
        ping("Couldn’t read that file");
      }
    };
    reader.readAsText(file);
  }

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
          The <span className="text-accent-2">Binder</span>
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
              tab === id
                ? "border-accent bg-raised text-ink"
                : "border-line bg-panel text-muted",
            )}
          >
            {id === "scan" ? "Scan" : "Collection"}
          </button>
        ))}
      </div>

      {tab === "scan" ? (
        <div className="space-y-5">
          <section className="rounded-lg border border-line bg-panel p-4 sm:p-5">
            <h2 className="font-display text-lg">Scan a page</h2>
            <p className="mt-1 mb-4 text-sm leading-relaxed text-muted">
              Photo a 9-pocket sleeve, toploaders, or cards on a table. Draw a box around one card to tag it, or identify the whole page.
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
                    <div
                      className="pointer-events-none absolute border-2 border-accent-2 bg-accent/20"
                      style={{
                        left: crop.x + (imgRef.current ? (imgRef.current.clientWidth - Math.min(imgRef.current.clientWidth, imgRef.current.naturalWidth * Math.min(imgRef.current.clientWidth / imgRef.current.naturalWidth, imgRef.current.clientHeight / imgRef.current.naturalHeight))) / 2 : 0),
                        top: crop.y + (imgRef.current ? (imgRef.current.clientHeight - Math.min(imgRef.current.clientHeight, imgRef.current.naturalHeight * Math.min(imgRef.current.clientWidth / imgRef.current.naturalWidth, imgRef.current.clientHeight / imgRef.current.naturalHeight))) / 2 : 0),
                        width: crop.w,
                        height: crop.h,
                      }}
                    />
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted">Drag on the photo to box one card.</p>
                <div className="mt-3 flex flex-wrap gap-2">
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
                      setCropForm(null);
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

          {cropForm ? (
            <section className="rounded-lg border border-line bg-panel p-4 sm:p-5">
              <h2 className="font-display text-lg">Tag this card</h2>
              {cropPreview ? (
                <img src={cropPreview} alt="Crop" className="mt-3 h-32 rounded-sm object-cover" />
              ) : null}
              <div className="mt-4">
                <CardForm values={cropForm} onChange={setCropForm} />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={saveCropped}
                  className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-ink"
                >
                  Add to binder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCropForm(null);
                    setCrop(null);
                  }}
                  className="h-11 px-3 text-sm font-semibold text-accent-2"
                >
                  Cancel crop
                </button>
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-line bg-panel p-4 sm:p-5">
            <h2 className="font-display text-lg">Add a card manually</h2>
            <p className="mt-1 mb-4 text-sm text-muted">No photo needed. One card at a time.</p>
            <CardForm values={manual} onChange={setManual} />
            <button
              type="button"
              onClick={saveManual}
              className="mt-4 h-11 rounded-md bg-accent px-4 text-sm font-semibold text-ink"
            >
              Add to binder
            </button>
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
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "h-10 shrink-0 rounded-full px-3 text-sm font-medium",
                  filter === f ? "bg-raised text-ink ring-1 ring-accent" : "bg-panel text-muted",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-panel px-3 text-sm font-semibold"
            >
              <Download className="size-4" /> Export
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-panel px-3 text-sm font-semibold"
            >
              <Upload className="size-4" /> Import
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
          ) : (
            <div className="space-y-4">
              {chunk(shown, 9).map((page, i) => (
                <div key={i} className="rounded-lg border border-line bg-panel p-3">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                    Page {i + 1}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 9 }).map((_, p) => {
                      const c = page[p];
                      return (
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
                              ? [c.year, c.brand, c.number ? `#${c.number}` : ""]
                                  .filter(Boolean)
                                  .join(" · ")
                              : ""}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
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
            <CardForm
              values={editing}
              onChange={(v) => setEditing({ ...editing, ...v })}
            />
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
                onClick={() => remove(editing.id)}
                className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-danger"
              >
                <Trash2 className="size-4" /> Delete
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

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
