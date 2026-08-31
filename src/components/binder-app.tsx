"use client";

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
  ChevronLeft,
  ChevronRight,
  Share2,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoLockup, LogoMark } from "@/components/logo";
import { BottomNav, type CollectionView } from "@/components/bottom-nav";
import { PortfolioHero } from "@/components/portfolio-hero";
import { CollectionCardTile } from "@/components/collection-card-tile";
import { CardDetailSheet } from "@/components/card-detail-sheet";
import { SetsView } from "@/components/sets-view";
import { StacksView } from "@/components/stacks-view";
import { CollxCompare } from "@/components/collx-compare";
import { MarketplaceView } from "@/components/marketplace-view";
import { ProPaywall, ProUpgradeCard } from "@/components/pro-upgrade";
import { FREE_CARD_LIMIT } from "@/lib/subscription";
import { useProSubscription } from "@/lib/use-pro-subscription";
import { listStackNames, topStackNames } from "@/lib/stacks";
import { formatMoney, cardValue, cardQty, groupBySet, groupByStack, portfolioStats } from "@/lib/portfolio";
import {
  assignMissingSlots,
  CATEGORIES,
  EMPTY_CARD,
  findDuplicate,
  marketplaceUrls,
  toMarketLookupInput,
  type SyncConflict,
  nextSlot,
  normalizeCard,
  parseValue,
  sortCards,
  toCsv,
  uid,
  type Card,
  type CardDraft,
  type Category,
  type SortKey,
} from "@/lib/cards";
import { boxesFromFractions, compressFull, cropToJpeg, mirrorNine, splitBoxes, splitNine } from "@/lib/image";
import { deleteCard, loadCards, putMany } from "@/lib/idb";
import { Processing, Protocol, Sync } from "@/lib/pipeline";
import type { IntegrityReport } from "@/lib/pipeline/types";
import {
  BinderClipSectionEnd,
  BinderRingHeader,
  EmbossedSealFooter,
  GradientBlock,
  HeaderLineWithMarker,
  SegmentedControl,
} from "@/components/brand";
import { fetchMarket } from "@/lib/market-client";
import { createShareLink, createShowcase, deleteCloudCard, deleteShowcase, getShowcaseProfile, listShowcases, pushCloudCards, setDefaultShowcase, updateShowcaseProfile, type ShowcaseSummary } from "@/lib/cloud";
import { PRO_SHOWCASE_LIMIT, type ShowcaseFilterMode } from "@/lib/showcase";
import { appendSnapshot, portfolioValueTrend } from "@/lib/price-history";
import { getBearerToken } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyProfile } from "@/lib/social";
import { CardForm } from "./card-form";
import { AuthSlot } from "./auth-slot";
import { CardPhotos, FlipThumb } from "./card-photos";
import { SocialView } from "./social-view";
import { IntegrityPanel } from "./integrity-panel";

type Tab = "scan" | "collection" | "settings";
type Filter = "All" | Category;
type StatusFilter = "all" | "owned" | "wishlist";
type KindFilter = "all" | "single" | "sealed";

const BACKUP_KEY = "the-binder-last-export";
const SHARE_URL_KEY = "the-binder-share-url";

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
    value: "45.00",
    condition: "NM",
    stack: "PC Hits",
    location: "Binder 1, Page 1",
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
    value: "420.00",
    condition: "LP",
    stack: "Vintage Pokémon",
    location: "Safe, Toploader box",
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
    value: "35.00",
    condition: "NM",
    notes: "Sample card — delete anytime.",
    createdAt: Date.now() - 1,
  },
] as Card[]);

type PaywallReason = "limit" | "export" | "refresh" | "stacks" | "checklist";

export function BinderApp() {
  const [ready, setReady] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [tab, setTab] = useState<Tab>("collection");
  const [filter, setFilter] = useState<Filter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<CollectionView>("catalog");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<Card | null>(null);
  const [detail, setDetail] = useState<Card | null>(null);
  const [bulkPricing, setBulkPricing] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [scanError, setScanError] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBackUrl, setPhotoBackUrl] = useState<string | null>(null);
  const [mirrorBack, setMirrorBack] = useState(true);
  const [photoReady, setPhotoReady] = useState(0);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [review, setReview] = useState<CardDraft[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [manual, setManual] = useState<CardDraft>({ ...EMPTY_CARD });
  const [manualIdentified, setManualIdentified] = useState(false);
  const [lastExport, setLastExport] = useState(0);
  const [undo, setUndo] = useState<Card | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [sharing, setSharing] = useState(false);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const [socialOpen, setSocialOpen] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [showcases, setShowcases] = useState<ShowcaseSummary[]>([]);
  const [activeShowcaseId, setActiveShowcaseId] = useState("");
  const [showcaseTitle, setShowcaseTitle] = useState("Main showcase");
  const [showcaseBio, setShowcaseBio] = useState("");
  const [showcaseName, setShowcaseName] = useState("");
  const [showcaseAvatar, setShowcaseAvatar] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [filterMode, setFilterMode] = useState<ShowcaseFilterMode>("all");
  const [filterStacks, setFilterStacks] = useState<string[]>([]);
  const [pickedCardIds, setPickedCardIds] = useState<string[]>([]);
  const [hideValues, setHideValues] = useState(false);
  const [showTradeList, setShowTradeList] = useState(true);
  const [showWantList, setShowWantList] = useState(true);
  const [showWishlist, setShowWishlist] = useState(false);
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);
  const [remotePending, setRemotePending] = useState<Card[]>([]);
  const [conflictPicks, setConflictPicks] = useState<Record<string, "local" | "remote">>({});
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<number | null>(null);
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
  const [integrityChecking, setIntegrityChecking] = useState(false);
  const [exportGateOpen, setExportGateOpen] = useState<"json" | "csv" | null>(null);
  const { user } = useCurrentUserState();
  const { isPro, trialDaysLeft, refresh } = useProSubscription();
  const imgRef = useRef<HTMLImageElement>(null);
  const imgBackRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraBackRef = useRef<HTMLInputElement>(null);
  const libraryBackRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCards()
      .then(async (rows) => {
        if (!rows.length) {
          await putMany(SAMPLE);
          setCards(SAMPLE);
        } else {
          const placed = assignMissingSlots(rows);
          await putMany(placed);
          setCards(placed);
        }
      })
      .catch(() => setCards(SAMPLE))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = getBearerToken() ?? undefined;
    void listShowcases(token).then(async (list) => {
      setShowcases(list);
      const active = list.find((s) => s.isDefault) ?? list[0];
      if (!active) return;
      setActiveShowcaseId(active.id);
      const profile = await getShowcaseProfile(active.id, token);
      if (!profile) return;
      setShowcaseTitle(profile.name);
      setShowcaseBio(profile.bio);
      setShowcaseName(profile.displayName);
      setShowcaseAvatar(profile.avatarUrl);
      setCustomSlug(profile.slug);
      setHideValues(profile.hideValues);
      setShowTradeList(profile.showTradeList);
      setShowWantList(profile.showWantList);
      setShowWishlist(profile.showWishlist);
      setFilterMode(profile.filterMode);
      setFilterStacks(profile.filterStacks);
      setPickedCardIds(profile.pickedCardIds);
      const url = `${window.location.origin}/c/${profile.slug}`;
      setShareUrl((prev) => prev || url);
    });
  }, [user]);

  async function switchShowcase(showcaseId: string) {
    const token = getBearerToken() ?? undefined;
    const profile = await getShowcaseProfile(showcaseId, token);
    if (!profile) return;
    setActiveShowcaseId(profile.id);
    setShowcaseTitle(profile.name);
    setShowcaseBio(profile.bio);
    setShowcaseName(profile.displayName);
    setShowcaseAvatar(profile.avatarUrl);
    setCustomSlug(profile.slug);
    setHideValues(profile.hideValues);
    setShowTradeList(profile.showTradeList);
    setShowWantList(profile.showWantList);
    setShowWishlist(profile.showWishlist);
    setFilterMode(profile.filterMode);
    setFilterStacks(profile.filterStacks);
    setPickedCardIds(profile.pickedCardIds);
    const url = `${window.location.origin}/c/${profile.slug}`;
    setShareUrl(url);
    localStorage.setItem(SHARE_URL_KEY, url);
  }

  useEffect(() => {
    if (!user) {
      setNeedsUsername(false);
      return;
    }
    void getMyProfile(getBearerToken() ?? undefined)
      .then((profile) => setNeedsUsername(!profile.username))
      .catch(() => setNeedsUsername(false));
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("setup") !== "username" || !user) return;
    setTab("settings");
    setSocialOpen(true);
    window.history.replaceState({}, "", window.location.pathname);
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pro") !== "success") return;
    window.history.replaceState({}, "", window.location.pathname);
    refresh();
    const started = Date.now();
    const poll = window.setInterval(() => {
      refresh();
      if (Date.now() - started > 30_000) window.clearInterval(poll);
    }, 2_000);
    return () => window.clearInterval(poll);
  }, [refresh]);

  useEffect(() => {
    const n = Number(localStorage.getItem(BACKUP_KEY) || 0);
    if (Number.isFinite(n)) setLastExport(n);
    const savedShare = localStorage.getItem(SHARE_URL_KEY);
    if (savedShare) setShareUrl(savedShare);
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = getBearerToken() ?? undefined;
    setCloudSyncing(true);
    void Sync.SyncManager.reconcile(token)
      .then(({ merged, conflicts, remote }) => {
        if (conflicts.length) {
          setSyncConflicts(conflicts);
          setRemotePending(remote);
          setConflictPicks(Object.fromEntries(conflicts.map((c) => [c.local.id, "local" as const])));
          return;
        }
        const sorted = assignMissingSlots(merged).sort((a, b) => b.createdAt - a.createdAt);
        void putMany(sorted);
        setCards(sorted);
        const toPush = sorted.filter((c) => !c.id.startsWith("sample-"));
        if (toPush.length) void pushCloudCards(toPush, token);
        setLastCloudSync(Sync.SyncManager.getState().lastSyncAt);
      })
      .catch(() => {})
      .finally(() => setCloudSyncing(false));
  }, [user?.id]);

  useEffect(() => {
    if (tab !== "settings" || socialOpen) return;
    setIntegrityReport(Protocol.runIntegrityCheck(cards));
  }, [tab, socialOpen, cards]);

  function recheckIntegrity() {
    setIntegrityChecking(true);
    setIntegrityReport(Protocol.runIntegrityCheck(cards));
    window.setTimeout(() => setIntegrityChecking(false), 300);
  }

  async function resolveConflicts(picks: Record<string, "local" | "remote">) {
    const merged = assignMissingSlots(
      await Sync.SyncManager.resolveAndPush(cards, remotePending, picks, getBearerToken() ?? undefined),
    ).sort((a, b) => b.createdAt - a.createdAt);
    setCards(merged);
    setSyncConflicts([]);
    setRemotePending([]);
    setLastCloudSync(Sync.SyncManager.getState().lastSyncAt);
    ping("Sync conflicts resolved");
  }

  function ping(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }

  function syncCloud(list: Card[]) {
    if (!user) return;
    const toPush = list.filter((c) => !c.id.startsWith("sample-"));
    if (toPush.length) void pushCloudCards(toPush, getBearerToken() ?? undefined).catch(() => {});
  }

  async function persist(card: Card, rest = cards) {
    const prev = rest.find((c) => c.id === card.id);
    const valueChanged = prev && parseValue(prev.value) !== parseValue(card.value);
    const stamped = {
      ...card,
      updatedAt: Date.now(),
      valueSnapshots: valueChanged ? appendSnapshot(prev?.valueSnapshots, card.value) : card.valueSnapshots ?? prev?.valueSnapshots ?? [],
    };
    const occupant = rest.find(
      (c) =>
        c.id !== stamped.id &&
        stamped.status === "owned" &&
        stamped.kind === "single" &&
        c.status === "owned" &&
        c.kind === "single" &&
        c.page === stamped.page &&
        c.pocket === stamped.pocket &&
        stamped.page > 0 &&
        stamped.pocket >= 0,
    );
    const writes = [stamped];
    if (occupant) {
      const prev = rest.find((c) => c.id === stamped.id);
      writes.push({ ...occupant, page: prev?.page || 0, pocket: prev?.pocket ?? -1, updatedAt: Date.now() });
    }
    await putMany(writes);
    setCards((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      writes.forEach((c) => map.set(c.id, c));
      syncCloud(writes);
      return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
    });
  }

  async function addDraft(draft: CardDraft) {
    if (draft.status === "owned" && !canAddCards(cardQty(draft as Card))) return null;
    let next: Card = { ...draft, id: uid(), createdAt: Date.now(), updatedAt: Date.now() };
    if (next.status === "owned" && next.kind === "single" && (next.page <= 0 || next.pocket < 0)) {
      next = { ...next, ...nextSlot(cards) };
    }
    await persist(next);
    return next;
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortCards(
      cards.filter((c) => {
        if (filter !== "All" && c.category !== filter) return false;
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        if (kindFilter !== "all" && c.kind !== kindFilter) return false;
        if (!q) return true;
        return [c.name, c.team, c.year, c.brand, c.setName, c.number, c.variant, c.notes, c.position, c.rarity]
          .join(" ")
          .toLowerCase()
          .includes(q);
      }),
      sort,
    );
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

  const stats = useMemo(() => portfolioStats(cards), [cards]);
  const valueTrend = useMemo(() => portfolioValueTrend(cards), [cards]);
  const setGroups = useMemo(() => groupBySet(cards), [cards]);
  const stackGroups = useMemo(() => groupByStack(cards), [cards]);
  const existingStackNames = useMemo(() => listStackNames(cards), [cards]);
  const quickStackNames = useMemo(() => topStackNames(cards), [cards]);
  const stackFormProps = { existingStacks: existingStackNames, quickStacks: quickStackNames };

  const needBackup = cards.length >= 3 && Date.now() - lastExport > 1000 * 60 * 60 * 24 * 3;
  const filterCount =
    (filter !== "All" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (kindFilter !== "all" ? 1 : 0);

  function goHome() {
    setTab("collection");
    setView("catalog");
    setSearchFocused(false);
    searchRef.current?.blur();
  }

  function goSearch() {
    setTab("collection");
    setView("catalog");
    setSearchFocused(true);
    window.setTimeout(() => searchRef.current?.focus(), 50);
  }

  function goSets() {
    setTab("collection");
    setView("sets");
    setSearchFocused(false);
    searchRef.current?.blur();
  }

  function goStacks() {
    setTab("collection");
    setView("stacks");
    setSearchFocused(false);
    searchRef.current?.blur();
    if (!isPro) setPaywall("stacks");
  }

  function openCard(card: Card) {
    setDetail(card);
  }

  function requirePro(reason: PaywallReason) {
    if (isPro) return true;
    setPaywall(reason);
    return false;
  }

  function ownedCount() {
    return cards.filter((c) => c.status === "owned").reduce((n, c) => n + cardQty(c), 0);
  }

  function canAddCards(count: number) {
    if (isPro) return true;
    if (ownedCount() + count <= FREE_CARD_LIMIT) return true;
    setPaywall("limit");
    return false;
  }

  function beginProTrial() {
    setPaywall(null);
    void startStripeCheckout();
  }

  async function startStripeCheckout() {
    if (!user) {
      ping("Sign in to subscribe with Stripe");
      window.location.href = "/login?reason=pro";
      return;
    }
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getBearerToken() ?? ""}`,
        },
      });
      const body = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (body.url) {
        window.location.href = body.url;
        return;
      }
      ping(body.error || "Billing is not configured yet.");
    } catch {
      ping("Couldn’t start checkout");
    }
  }

  async function refreshAllPrices() {
    if (!requirePro("refresh")) return;
    const owned = cards.filter((c) => c.status === "owned" && c.name.trim());
    if (!owned.length) {
      ping("Add cards to refresh prices");
      return;
    }
    setBulkPricing(true);
    let updated = 0;
    let pool = cards;
    for (const card of owned.slice(0, 24)) {
      try {
        const result = await fetchMarket(toMarketLookupInput(card));
        const next = {
          ...card,
          value: result.value || card.value,
          marketSource: result.source || card.marketSource,
          tcgplayerUrl: result.tcgplayerUrl || card.tcgplayerUrl,
          ebayUrl: result.ebayUrl || card.ebayUrl,
          pricechartingUrl: result.pricechartingUrl || card.pricechartingUrl,
          comcUrl: result.comcUrl || card.comcUrl,
          point130Url: result.point130Url || card.point130Url,
          valueSnapshots: result.value ? appendSnapshot(card.valueSnapshots, result.value) : card.valueSnapshots,
          updatedAt: Date.now(),
        };
        pool = pool.map((c) => (c.id === card.id ? next : c));
        if (result.value) updated += 1;
      } catch {
        // skip failed lookups
      }
    }
    await putMany(pool);
    setCards(pool);
    syncCloud(pool);
    setBulkPricing(false);
    ping(updated ? `Updated ${updated} price${updated === 1 ? "" : "s"}` : "Prices refreshed where available");
  }

  function onFile(file: File | undefined, side: "front" | "back" = "front") {
    setScanError("");
    if (!file) return;
    const ok = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!ok) {
      setScanError("That file doesn’t look like a photo of cards.");
      return;
    }
    const url = URL.createObjectURL(file);
    if (side === "back") {
      if (photoBackUrl) URL.revokeObjectURL(photoBackUrl);
      setPhotoBackUrl(url);
    } else {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(url);
      setPhotoReady(0);
      setCrop(null);
    }
  }

  function backsForFronts(frontCount: number) {
    const img = imgBackRef.current;
    if (!img?.naturalWidth) return Array.from({ length: frontCount }, () => "");
    let backs = splitNine(img);
    if (mirrorBack) backs = mirrorNine(backs);
    while (backs.length < frontCount) backs.push("");
    return backs.slice(0, frontCount);
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
    return { x, y, scale };
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
    setReview((prev) => {
      const draft: CardDraft = { ...EMPTY_CARD, image: data };
      setReviewIndex(prev.length);
      return [...prev, draft];
    });
    setCrop(null);
  }

  function splitPage() {
    const img = imgRef.current;
    if (!img) return;
    const fronts = splitNine(img).filter(Boolean);
    const backs = backsForFronts(fronts.length);
    setReview(fronts.map((image, i) => ({ ...EMPTY_CARD, image, imageBack: backs[i] || "" })));
    setReviewIndex(0);
    ping(photoBackUrl ? "9 fronts paired with 9 backs" : "9 fronts ready — add a back photo to pair reverses");
  }

  const currentReview = review[reviewIndex] || null;
  const reviewDup = currentReview ? findDuplicate(cards, currentReview) : null;
  const manualDup = findDuplicate(cards, manual);
  const editDup = editing ? findDuplicate(cards, editing, editing.id) : null;

  function patchReview(next: CardDraft) {
    setReview((prev) => prev.map((d, i) => (i === reviewIndex ? next : d)));
  }

  async function saveReviewOne() {
    if (!currentReview) return;
    const draft = withUntitledName(currentReview);
    if (!draft.image && !draft.imageBack && !draft.name.trim()) {
      ping("Add a photo or a name");
      return;
    }
    await addDraft(draft);
    ping("Added to collection");
    const remaining = review.filter((_, i) => i !== reviewIndex);
    setReview(remaining);
    setReviewIndex(Math.min(reviewIndex, Math.max(0, remaining.length - 1)));
  }

  async function saveReviewAll() {
    const ready = review.filter((d) => d.image || d.imageBack || d.name.trim());
    if (!ready.length) {
      ping("Upload photos first, then add them");
      return;
    }
    await saveDraftsToCollection(ready.map((d, i) => withUntitledName(d, i)));
  }

  async function saveManual() {
    const draft = withUntitledName(manual);
    if (!draft.image && !draft.imageBack && !manual.name.trim()) {
      ping("Add a photo or a name");
      return;
    }
    await addDraft(draft);
    ping("Added to collection");
    setManual({ ...EMPTY_CARD });
    setTab("collection");
  }

  async function addPageToCollection() {
    const img = imgRef.current;
    if (!img) {
      ping("Upload a front photo first");
      return;
    }
    const fronts = splitNine(img).filter(Boolean);
    const backs = backsForFronts(fronts.length);
    const drafts = fronts.map((image, i) =>
      withUntitledName({ ...EMPTY_CARD, image, imageBack: backs[i] || "" }, i),
    );
    await saveDraftsToCollection(drafts);
  }

  async function saveDraftsToCollection(drafts: CardDraft[]) {
    const addingOwned = drafts.filter((d) => d.status !== "wishlist").length;
    if (!canAddCards(addingOwned)) return;
    const added: Card[] = [];
    let pool = cards;
    for (const draft of drafts) {
      let next: Card = { ...draft, id: uid(), createdAt: Date.now(), updatedAt: Date.now() };
      if (next.status === "owned" && next.kind === "single" && (next.page <= 0 || next.pocket < 0)) {
        next = { ...next, ...nextSlot(pool) };
      }
      pool = [next, ...pool];
      added.push(next);
    }
    await putMany(added);
    syncCloud(added);
    setCards(pool);
    setReview([]);
    ping(`Added ${added.length} card${added.length === 1 ? "" : "s"} to collection`);
    setTab("collection");
  }

  async function runIdentify() {
    const img = imgRef.current;
    if (!img) return;
    setIdentifying(true);
    setScanError("");
    try {
      const imageDataUrl = compressFull(img, 1280, 0.72);
      const fractions = (
        await Processing.identifyLayer(imageDataUrl)
      );
      if (!fractions.ok) {
        setScanError(fractions.error);
        return;
      }
      const boxes = fractions.cards.map((c) => c.box).filter(Boolean) as {
        x: number;
        y: number;
        w: number;
        h: number;
      }[];
      const fromBoxes = boxes.length
        ? splitBoxes(img, boxesFromFractions(img.naturalWidth, img.naturalHeight, boxes))
        : [];
      const pocketImages = fromBoxes.length ? fromBoxes : splitNine(img);
      const backs = backsForFronts(Math.max(pocketImages.length, fractions.cards.length));
      const processed = await Processing.processPageScan(imageDataUrl, pocketImages, backs);
      if (!processed.ok) {
        setScanError(processed.error);
        return;
      }
      const drafts = processed.cards.map((c) => c.draft);
      setReview(drafts);
      setReviewIndex(0);
      ping(`Review ${drafts.length} identified card${drafts.length === 1 ? "" : "s"}`);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Identify failed.");
    } finally {
      setIdentifying(false);
    }
  }

  async function identifySingle() {
    if (!manual.image) {
      ping("Add a front photo first");
      return;
    }
    setIdentifying(true);
    setScanError("");
    try {
      const result = await Processing.identifyLayer(manual.image);
      if (!result.ok) {
        setScanError(result.error);
        return;
      }
      const hit = result.cards[0];
      if (!hit) {
        setScanError("Couldn’t read that card.");
        return;
      }
      const { box: _box, ...rest } = hit;
      const merged: CardDraft = {
        ...manual,
        ...rest,
        image: manual.image,
        imageBack: manual.imageBack,
        ...marketplaceUrls({ ...EMPTY_CARD, ...rest }),
      };
      setManual(merged);
      setManualIdentified(true);
      void priceDraft(merged, setManual);
      ping("Identified — check price and add");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Identify failed.");
    } finally {
      setIdentifying(false);
    }
  }

  async function priceDraft(draft: CardDraft, apply: (next: CardDraft) => void) {
    setPricing(true);
    try {
      const result = await fetchMarket(toMarketLookupInput(draft));
      apply({
        ...draft,
        value: result.value || draft.value,
        marketSource: result.source || draft.marketSource,
        tcgplayerUrl: result.tcgplayerUrl,
        ebayUrl: result.ebayUrl,
        pricechartingUrl: result.pricechartingUrl,
        comcUrl: result.comcUrl || draft.comcUrl,
        point130Url: result.point130Url || draft.point130Url,
      });
      ping(result.value ? `Market ${result.value}` : result.error || result.source || "Marketplace links added — value left for you");
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
    const gone = cards.find((c) => c.id === id) || null;
    await deleteCard(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setEditing(null);
    setDetail(null);
    setConfirmId(null);
    setUndo(gone);
    if (user && gone && !gone.id.startsWith("sample-")) void deleteCloudCard(id, getBearerToken() ?? undefined).catch(() => {});
    ping("Deleted — tap undo if that was a mistake");
  }

  async function undoDelete() {
    if (!undo) return;
    await persist(undo);
    setUndo(null);
    ping("Restored");
  }

  function markExported() {
    const now = Date.now();
    localStorage.setItem(BACKUP_KEY, String(now));
    setLastExport(now);
  }

  function doExportJson() {
    downloadBlob(
      new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), cards }, null, 2)], {
        type: "application/json",
      }),
      "the-card-binder-collection.json",
    );
    markExported();
    ping("JSON backup downloaded");
  }

  function doExportCsv() {
    downloadBlob(new Blob([toCsv(cards)], { type: "text/csv" }), "the-card-binder-collection.csv");
    markExported();
    ping("CSV downloaded");
  }

  function requestExport(format: "json" | "csv") {
    if (!requirePro("export")) return;
    const report = Protocol.runIntegrityCheck(cards);
    setIntegrityReport(report);
    if (!report.ok) {
      setExportGateOpen(format);
      return;
    }
    if (format === "json") doExportJson();
    else doExportCsv();
  }

  function exportJson() {
    requestExport("json");
  }

  function exportCsv() {
    requestExport("csv");
  }

  function exportDespiteIssues() {
    const format = exportGateOpen;
    setExportGateOpen(null);
    if (format === "json") doExportJson();
    else if (format === "csv") doExportCsv();
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result));
        const incoming = Array.isArray(data) ? data : data.cards || [];
        const have = new Map(cards.map((c) => [c.id, c]));
        incoming.forEach((raw: unknown) => {
          const next = normalizeCard(raw);
          if (next) have.set(next.id, next);
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
    const lines = shown.map((c) =>
      ["•", c.name, c.year, c.setName, c.number ? `#${c.number}` : "", c.value].filter(Boolean).join(" "),
    );
    void navigator.clipboard.writeText(`The Binder (${shown.length})\n${lines.join("\n")}`).then(
      () => ping("Collection list copied"),
      () => ping("Couldn’t copy"),
    );
  }

  async function shareCollection() {
    if (!user) {
      ping("Sign in to share your catalog");
      window.location.href = "/login?reason=share";
      return;
    }
    setSharing(true);
    try {
      const toPush = cards.filter((c) => !c.id.startsWith("sample-"));
      if (toPush.length) await pushCloudCards(toPush, getBearerToken() ?? undefined);
      const { slug } = await createShareLink(getBearerToken() ?? undefined, activeShowcaseId || undefined);
      const url = `${window.location.origin}/c/${slug}`;
      setShareUrl(url);
      localStorage.setItem(SHARE_URL_KEY, url);
      if (!toPush.length) {
        ping("Sample cards stay private. Add your own cards, then share.");
        return;
      }
      try {
        if (typeof navigator.share === "function") {
          await navigator.share({
            title: "My Binder catalog",
            text: "View my card catalog on The Binder.",
            url,
          });
          ping("Catalog shared");
        } else {
          await navigator.clipboard.writeText(url);
          ping("Share link copied");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          ping("Share link ready");
        } else {
          try {
            await navigator.clipboard.writeText(url);
            ping("Share link copied");
          } catch {
            ping("Share link ready");
          }
        }
      }
    } catch {
      ping("Couldn’t create a share link. Sign in and try again.");
    } finally {
      setSharing(false);
    }
  }

  const screenTitle =
    tab === "scan"
      ? "Scan"
      : tab === "settings"
        ? socialOpen
          ? "Collectors"
          : "Profile"
        : view === "sets"
          ? "Sets"
          : "Collection";

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-[max(4rem,env(safe-area-inset-top))] pb-16">
        <div className="h-8 w-40 rounded-sm bg-raised" />
        <div className="mt-6 h-64 rounded-lg border border-line bg-panel" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-3xl overflow-x-clip px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-16">
      <header className={cn(
        "sticky top-0 z-20 -mx-4 mb-3 flex items-center gap-2 border-b px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur sm:gap-3",
        tab === "settings" && !socialOpen
          ? "border-line bg-bg/90 text-ink"
          : "brand-header-collection border-transparent text-white",
      )}>
        <LogoMark className="size-8 shrink-0 md:hidden" title="The Card Binder" />
        <h1 className={cn(
          "min-w-0 flex-1 truncate font-sans text-lg font-bold tracking-tight md:hidden",
          tab !== "settings" || socialOpen ? "text-white" : "",
        )}>
          {screenTitle}
        </h1>
        <LogoLockup
          className="hidden min-w-0 flex-1 md:flex"
          inverted={tab !== "settings" || socialOpen}
          showTagline
          titleAs="h1"
        />
        <button
          type="button"
          disabled={sharing}
          onClick={() => void shareCollection()}
          aria-label={sharing ? "Sharing collection" : "Share collection"}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold disabled:opacity-50",
            tab === "settings" && !socialOpen
              ? "bg-binder-blue text-white"
              : "bg-white/15 text-white",
          )}
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline">{sharing ? "Sharing…" : "Share"}</span>
        </button>
        <div className="hidden md:block">
          <AuthSlot />
        </div>
      </header>

      {needsUsername && !socialOpen ? (
        <button
          type="button"
          onClick={() => {
            setTab("settings");
            setSocialOpen(true);
          }}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-lg border border-binder-blue/30 bg-binder-blue/10 px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-binder-blue">Pick a username</p>
            <p className="text-xs text-muted">Required to find collectors and add friends.</p>
          </div>
          <Users className="size-5 shrink-0 text-binder-blue" />
        </button>
      ) : null}

      <div className="sticky top-14 z-20 mb-5 hidden md:block">
        <SegmentedControl
          aria-label="Main navigation"
          value={tab === "settings" ? "collection" : tab}
          onChange={(id) => {
            if (id === "scan" || id === "collection") setTab(id);
          }}
          options={[
            { value: "scan", label: "Scan" },
            { value: "collection", label: "Collection" },
          ]}
          className="w-full [&>div]:flex [&>div]:w-full [&_button]:flex-1"
        />
      </div>

      {needBackup && (tab === "collection" || tab === "settings") ? (
        <div className="mb-4 rounded-md border border-accent/40 bg-raised px-4 py-3 text-sm">
          Collection lives on this phone. Export a backup so you don’t lose it.
          <button type="button" className="ml-2 font-semibold text-accent-2" onClick={exportJson}>
            Export JSON
          </button>
        </div>
      ) : null}

      {tab === "scan" ? (
        <div className="space-y-5">
          <GradientBlock className="-mx-4 rounded-b-2xl px-4 py-5">
            <HeaderLineWithMarker className="mb-4" markerPosition={0.28} />
            <h2 className="font-display text-2xl font-bold">Scan a card</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Unlimited scans on Free — snap, identify, price, add.
            </p>
          </GradientBlock>

          <BinderRingHeader title="Quick Scan" />
          <section className="rounded-xl border border-line bg-panel p-4 sm:p-5">
            <h2 className="font-display text-lg">Quick scan — one card</h2>
            <ScanSteps active={manual.image ? (manualIdentified ? 4 : manual.name.trim() ? 3 : 2) : 1} />
            <p className="mt-3 mb-4 text-sm text-muted">Photograph the front (and back if you have it). We&apos;ll identify it and pull a price.</p>
            <CardPhotos
              front={manual.image}
              back={manual.imageBack}
              onFront={(image) => {
                setManual({ ...manual, image });
                setManualIdentified(false);
              }}
              onBack={(imageBack) => setManual({ ...manual, imageBack })}
            />
            {manualIdentified && manual.name.trim() ? (
              <div className="mb-4 rounded-lg border border-binder-blue/30 bg-binder-blue/10 px-3 py-2.5 text-sm">
                <p className="font-semibold text-ink">{manual.name}</p>
                <p className="text-muted">
                  {manual.value ? `Market value: ${manual.value}` : "Price lookup running or unavailable — enter a value below."}
                </p>
              </div>
            ) : null}
            {manual.image || manual.imageBack ? (
              <div className="mb-4 flex flex-wrap gap-2">
                <button type="button" onClick={saveManual} className="btn-binder-primary h-11 px-4 text-sm">
                  Add to collection
                </button>
                <button type="button" disabled={identifying} onClick={() => void identifySingle()} className="h-11 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-50">
                  {identifying ? "Identifying…" : "Identify & price"}
                </button>
              </div>
            ) : null}
            {manualDup ? (
              <p className="mb-3 rounded-sm bg-raised px-3 py-2 text-sm text-accent-2">
                You already have {manualDup.name}
                {manualDup.number ? ` #${manualDup.number}` : ""}.
              </p>
            ) : null}
            <CardForm values={manual} onChange={setManual} {...stackFormProps} />
            <MarketLinks card={manual} />
            {scanError ? <p className="mt-3 text-sm text-danger">{scanError}</p> : null}
          </section>

          <BinderRingHeader title="Binder Page" />
          <section className="rounded-xl border border-line bg-panel p-4 sm:p-5">
            <h2 className="font-display text-lg">Binder page — 9 pockets</h2>
            <p className="mt-1 mb-4 text-sm leading-relaxed text-muted">
              Photo the front of a 9-pocket sleeve, then the back. Unlimited scans on Free.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <PageShot
                label="Page front"
                url={photoUrl}
                onCamera={() => cameraRef.current?.click()}
                onLibrary={() => libraryRef.current?.click()}
                onClear={() => {
                  if (photoUrl) URL.revokeObjectURL(photoUrl);
                  setPhotoUrl(null);
                  setCrop(null);
                }}
              >
                {photoUrl ? (
                  <div className="relative overflow-hidden rounded-md bg-pocket">
                    <img
                      ref={imgRef}
                      src={photoUrl}
                      alt="Page front"
                      onLoad={() => setPhotoReady((n) => n + 1)}
                      className="mx-auto block max-h-[46vh] w-full object-contain"
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
                    {crop ? <CropBox crop={crop} img={imgRef.current} /> : photoReady ? <NineGuide img={imgRef.current} /> : null}
                  </div>
                ) : null}
              </PageShot>
              <PageShot
                label="Page back"
                url={photoBackUrl}
                onCamera={() => cameraBackRef.current?.click()}
                onLibrary={() => libraryBackRef.current?.click()}
                onClear={() => {
                  if (photoBackUrl) URL.revokeObjectURL(photoBackUrl);
                  setPhotoBackUrl(null);
                }}
              >
                {photoBackUrl ? (
                  <img
                    ref={imgBackRef}
                    src={photoBackUrl}
                    alt="Page back"
                    className="mx-auto block max-h-[46vh] w-full rounded-md object-contain"
                  />
                ) : null}
              </PageShot>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0], "front")} />
            <input ref={libraryRef} type="file" accept="*/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0], "front")} />
            <input ref={cameraBackRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0], "back")} />
            <input ref={libraryBackRef} type="file" accept="*/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0], "back")} />
            {photoUrl ? (
              <>
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={mirrorBack} onChange={(e) => setMirrorBack(e.target.checked)} className="size-4" />
                  Back photo is a flipped sleeve (mirror left/right)
                </label>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  <button type="button" onClick={() => void addPageToCollection()} className="btn-binder-primary h-11 px-4 text-sm sm:w-auto">
                    Add to collection
                  </button>
                  <button type="button" onClick={splitPage} className="h-11 rounded-md border border-line bg-raised px-4 text-sm font-semibold sm:w-auto">
                    Split into 9 pockets
                  </button>
                  <button type="button" disabled={identifying} onClick={runIdentify} className="h-11 rounded-md border border-line px-4 text-sm font-semibold disabled:opacity-50 sm:w-auto">
                    {identifying ? "Identifying…" : "Identify cards on this page"}
                  </button>
                </div>
              </>
            ) : null}
            {scanError && !manual.image ? <p className="mt-3 text-sm text-danger">{scanError}</p> : null}
          </section>

          {currentReview ? (
            <section className="rounded-lg border border-line bg-panel p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-lg">
                  Review {reviewIndex + 1} of {review.length}
                </h2>
                <div className="flex gap-1">
                  <button type="button" className="grid size-11 place-items-center rounded-md border border-line" disabled={reviewIndex === 0} onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}>
                    <ChevronLeft className="size-4" />
                  </button>
                  <button type="button" className="grid size-11 place-items-center rounded-md border border-line" disabled={reviewIndex >= review.length - 1} onClick={() => setReviewIndex((i) => Math.min(review.length - 1, i + 1))}>
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
              <CardPhotos
                front={currentReview.image}
                back={currentReview.imageBack}
                onFront={(image) => patchReview({ ...currentReview, image })}
                onBack={(imageBack) => patchReview({ ...currentReview, imageBack })}
              />
              {reviewDup ? (
                <p className="mb-3 rounded-sm bg-raised px-3 py-2 text-sm text-accent-2">
                  Looks like a duplicate of {reviewDup.name}
                  {reviewDup.number ? ` #${reviewDup.number}` : ""}.
                </p>
              ) : null}
              <CardForm values={currentReview} onChange={patchReview} {...stackFormProps} />
              <MarketLinks card={currentReview} />
              <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                <button type="button" onClick={saveReviewOne} className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white">
                  Add to collection
                </button>
                <button type="button" disabled={pricing} onClick={() => currentReview && priceDraft(currentReview, patchReview)} className="h-11 rounded-md border border-line px-4 text-sm font-semibold">
                  {pricing ? "Looking up…" : "Lookup price"}
                </button>
                <button type="button" onClick={saveReviewAll} className="h-11 rounded-md border border-line px-4 text-sm font-semibold">
                  Add all photos
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
        </div>
      ) : tab === "settings" ? (
        socialOpen ? (
          <SocialView
            onBack={() => setSocialOpen(false)}
            onUsernameSet={() => setNeedsUsername(false)}
          />
        ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-panel p-4">
            <h2 className="font-display text-lg">Collectors</h2>
            <p className="mt-1 mb-4 text-sm text-muted">
              Find other collectors, send friend requests, and browse featured showcases.
            </p>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setSocialOpen(true)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-binder-blue px-4 text-sm font-semibold text-white"
              >
                <Users className="size-4" />
                Browse collectors
              </button>
              <a
                href="/featured"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-line text-sm font-semibold"
              >
                Featured collections
              </a>
            </div>
          </section>
          <ProUpgradeCard
            isPro={isPro}
            trialDaysLeft={trialDaysLeft}
            onStartTrial={beginProTrial}
            onCheckout={() => void startStripeCheckout()}
          />
          <CollxCompare isPro={isPro} onUpgrade={beginProTrial} />
          <MarketplaceView cards={cards} isPro={isPro} userSignedIn={Boolean(user)} onNotify={ping} />
          <section className="rounded-lg border border-line bg-panel p-4">
            <h2 className="font-display text-lg">Account</h2>
            <p className="mt-1 mb-4 text-sm text-muted">Sign in to keep this collection on every device.</p>
            <AuthSlot />
          </section>
          <section className="rounded-lg border border-line bg-panel p-4">
            <h2 className="font-display text-lg">Share collection</h2>
            <p className="mt-1 mb-4 text-sm leading-relaxed text-muted">
              Anyone with the link can view your owned cards. Wishlist stays private.
            </p>
            <button
              type="button"
              disabled={sharing}
              onClick={() => void shareCollection()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Share2 className="size-4" />
              {sharing ? "Sharing…" : user ? "Share collection" : "Sign in to share"}
            </button>
            {shareUrl ? (
              <div className="mt-3 flex flex-col gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  aria-label="Public catalog link"
                  className="h-11 min-w-0 w-full rounded-md border border-line bg-pocket px-3 text-sm text-ink outline-none"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(shareUrl).then(
                        () => ping("Share link copied"),
                        () => ping("Couldn’t copy"),
                      );
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold"
                  >
                    Copy
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm font-semibold"
                  >
                    <ExternalLink className="size-4" />
                    Open
                  </a>
                </div>
              </div>
            ) : null}
          </section>
          {user ? (
            <section className="rounded-lg border border-line bg-panel p-4">
              <h2 className="font-display text-lg">Showcase profile</h2>
              <p className="mt-1 mb-4 text-sm text-muted">
                Bio, avatar, and trade lists on your public page. Free users get one showcase; Pro unlocks up to {PRO_SHOWCASE_LIMIT}.
              </p>
              <div className="space-y-3">
                {showcases.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={activeShowcaseId}
                      onChange={(e) => void switchShowcase(e.target.value)}
                      className="h-11 min-w-0 flex-1 rounded-md border border-line bg-pocket px-3 text-sm"
                    >
                      {showcases.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.isDefault ? " (default)" : ""}
                        </option>
                      ))}
                    </select>
                    {isPro && showcases.length < PRO_SHOWCASE_LIMIT ? (
                      <button
                        type="button"
                        onClick={() => {
                          const name = window.prompt("Showcase name", "New showcase");
                          if (!name?.trim()) return;
                          void createShowcase(name.trim(), getBearerToken() ?? undefined).then(async (res) => {
                            if (!res.ok) {
                              ping(res.error);
                              return;
                            }
                            const list = await listShowcases(getBearerToken() ?? undefined);
                            setShowcases(list);
                            await switchShowcase(res.id);
                            ping("Showcase created");
                          });
                        }}
                        className="h-11 rounded-md border border-line px-4 text-sm font-semibold"
                      >
                        New
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <label className="block text-sm">
                  <span className="font-semibold">Showcase title</span>
                  <input
                    value={showcaseTitle}
                    onChange={(e) => setShowcaseTitle(e.target.value)}
                    className="mt-1 h-11 w-full rounded-md border border-line bg-pocket px-3"
                    placeholder="Vintage Pokémon, Trade binder…"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Avatar URL</span>
                  <input
                    value={showcaseAvatar}
                    onChange={(e) => setShowcaseAvatar(e.target.value)}
                    className="mt-1 h-11 w-full rounded-md border border-line bg-pocket px-3"
                    placeholder="https://… (optional image link)"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Display name</span>
                  <input
                    value={showcaseName}
                    onChange={(e) => setShowcaseName(e.target.value)}
                    className="mt-1 h-11 w-full rounded-md border border-line bg-pocket px-3"
                    placeholder="Your collector name"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Bio</span>
                  <textarea
                    value={showcaseBio}
                    onChange={(e) => setShowcaseBio(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-line bg-pocket px-3 py-2"
                    placeholder="What you collect, what you're trading…"
                  />
                </label>
                <div className="rounded-md border border-line bg-pocket p-3 text-sm">
                  <p className="font-semibold">Cards to show</p>
                  <div className="mt-2 space-y-2">
                    {(["all", "stacks", "pick"] as const).map((mode) => (
                      <label key={mode} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="showcase-filter"
                          checked={filterMode === mode}
                          onChange={() => setFilterMode(mode)}
                        />
                        {mode === "all" ? "Entire collection" : mode === "stacks" ? "By stack" : "Hand-picked cards"}
                      </label>
                    ))}
                  </div>
                  {filterMode === "stacks" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {existingStackNames.length ? (
                        existingStackNames.map((stack) => {
                          const on = filterStacks.some((s) => s.toLowerCase() === stack.toLowerCase());
                          return (
                            <button
                              key={stack}
                              type="button"
                              onClick={() =>
                                setFilterStacks((prev) =>
                                  on ? prev.filter((s) => s.toLowerCase() !== stack.toLowerCase()) : [...prev, stack],
                                )
                              }
                              className={`rounded-lg px-3 py-1 text-xs font-semibold ${on ? "bg-binder-blue text-white" : "border border-line"}`}
                            >
                              {stack}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted">Add stacks to your cards first.</p>
                      )}
                    </div>
                  ) : null}
                  {filterMode === "pick" ? (
                    <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
                      {cards
                        .filter((c) => c.status === "owned" && !c.id.startsWith("sample-"))
                        .slice(0, 60)
                        .map((c) => {
                          const on = pickedCardIds.includes(c.id);
                          return (
                            <label key={c.id} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() =>
                                  setPickedCardIds((prev) =>
                                    on ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                                  )
                                }
                              />
                              <span className="truncate">{c.name}</span>
                            </label>
                          );
                        })}
                    </div>
                  ) : null}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hideValues} onChange={(e) => setHideValues(e.target.checked)} />
                  Hide card values on public page
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showTradeList} onChange={(e) => setShowTradeList(e.target.checked)} />
                  Show trade list
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showWantList} onChange={(e) => setShowWantList(e.target.checked)} />
                  Show want list
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showWishlist} onChange={(e) => setShowWishlist(e.target.checked)} />
                  Show wishlist on showcase
                </label>
                {isPro ? (
                  <label className="block text-sm">
                    <span className="font-semibold">Custom URL (Pro)</span>
                    <div className="mt-1 flex items-center gap-1 text-muted">
                      <span className="text-xs">/c/</span>
                      <input
                        value={customSlug}
                        onChange={(e) => setCustomSlug(e.target.value)}
                        className="h-11 min-w-0 flex-1 rounded-md border border-line bg-pocket px-3"
                        placeholder="your-name"
                      />
                    </div>
                  </label>
                ) : (
                  <p className="text-xs text-muted">Pro unlocks custom URLs and multiple showcases.</p>
                )}
                {shareUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      const tradeUrl = shareUrl.replace(/\/$/, "") + "/trade";
                      void navigator.clipboard.writeText(tradeUrl).then(
                        () => ping("Trade pool link copied"),
                        () => ping("Couldn’t copy"),
                      );
                    }}
                    className="h-10 w-full rounded-md border border-line text-sm font-semibold"
                  >
                    Copy trade pool link
                  </button>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  {showcases.length > 1 && !showcases.find((s) => s.id === activeShowcaseId)?.isDefault ? (
                    <button
                      type="button"
                      onClick={() => {
                        void setDefaultShowcase(activeShowcaseId, getBearerToken() ?? undefined).then(async (res) => {
                          if (!res.ok) {
                            ping(res.error);
                            return;
                          }
                          const list = await listShowcases(getBearerToken() ?? undefined);
                          setShowcases(list);
                          ping("Default showcase updated");
                        });
                      }}
                      className="h-10 rounded-md border border-line text-sm font-semibold"
                    >
                      Set default
                    </button>
                  ) : null}
                  {isPro && showcases.length > 1 && !showcases.find((s) => s.id === activeShowcaseId)?.isDefault ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm("Delete this showcase? The public link will stop working.")) return;
                        void deleteShowcase(activeShowcaseId, getBearerToken() ?? undefined).then(async (res) => {
                          if (!res.ok) {
                            ping(res.error);
                            return;
                          }
                          const list = await listShowcases(getBearerToken() ?? undefined);
                          setShowcases(list);
                          const next = list.find((s) => s.isDefault) ?? list[0];
                          if (next) await switchShowcase(next.id);
                          ping("Showcase deleted");
                        });
                      }}
                      className="h-10 rounded-md border border-danger/40 text-sm font-semibold text-danger"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void updateShowcaseProfile(
                      {
                        showcaseId: activeShowcaseId || undefined,
                        name: showcaseTitle,
                        displayName: showcaseName,
                        bio: showcaseBio,
                        avatarUrl: showcaseAvatar,
                        hideValues,
                        showTradeList,
                        showWantList,
                        showWishlist,
                        filterMode,
                        filterStacks,
                        pickedCardIds,
                        customSlug: isPro ? customSlug : undefined,
                      },
                      getBearerToken() ?? undefined,
                    ).then(async (res) => {
                      if (!res.ok) {
                        ping(res.error);
                        return;
                      }
                      const url = `${window.location.origin}/c/${res.slug}`;
                      setShareUrl(url);
                      localStorage.setItem(SHARE_URL_KEY, url);
                      const list = await listShowcases(getBearerToken() ?? undefined);
                      setShowcases(list);
                      if (res.showcaseId) setActiveShowcaseId(res.showcaseId);
                      ping("Showcase updated");
                    });
                  }}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-binder-blue text-sm font-semibold text-white"
                >
                  Save showcase
                </button>
              </div>
            </section>
          ) : null}
          {user ? (
            <section className="rounded-lg border border-line bg-panel p-4">
              <h2 className="font-display text-lg">Cloud sync</h2>
              <p className="mt-1 text-sm text-muted">
                {cloudSyncing
                  ? "Reconciling local catalog with encrypted cloud backup…"
                  : lastCloudSync
                    ? `Last synced ${new Date(lastCloudSync).toLocaleString()}`
                    : "Sign-in sync keeps this device aligned with your cloud catalog."}
              </p>
              {syncConflicts.length ? (
                <p className="mt-2 text-sm font-semibold text-binder-orange">
                  {syncConflicts.length} conflict{syncConflicts.length === 1 ? "" : "s"} need your attention.
                </p>
              ) : null}
            </section>
          ) : null}
          {integrityReport ? (
            <IntegrityPanel
              report={integrityReport}
              checking={integrityChecking}
              onRecheck={recheckIntegrity}
            />
          ) : null}
          <section className="rounded-lg border border-line bg-panel p-4">
            <h2 className="font-display text-lg">Backup</h2>
            <p className="mt-1 mb-4 text-sm text-muted">Export or import this catalog as a file. Integrity is checked before each export.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={exportJson} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-raised px-3 text-sm font-semibold">
                <Download className="size-4" /> JSON
              </button>
              <button type="button" onClick={exportCsv} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-raised px-3 text-sm font-semibold">
                <Download className="size-4" /> CSV
              </button>
              <button type="button" onClick={() => importRef.current?.click()} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-raised px-3 text-sm font-semibold">
                <Upload className="size-4" /> Import
              </button>
              <button type="button" onClick={copyShare} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line bg-raised px-3 text-sm font-semibold">
                Copy list
              </button>
            </div>
          </section>
        </div>
        )
      ) : (
        <div>
          <PortfolioHero
            stats={stats}
            refreshing={bulkPricing}
            isPro={isPro}
            trialDaysLeft={trialDaysLeft}
            valueTrend={valueTrend ?? undefined}
            onRefreshPrices={() => void refreshAllPrices()}
            onUpgrade={beginProTrial}
          />
          <SegmentedControl
            scrollable
            aria-label="Collection view"
            value={view}
            onChange={(id) => (id === "stacks" ? goStacks() : setView(id))}
            options={[
              { value: "catalog", label: "Grid" },
              { value: "list", label: "List" },
              { value: "binder", label: "Binder" },
              { value: "sets", label: "Sets" },
              { value: "stacks", label: "Stacks" },
            ]}
            className="mb-3"
          />
          <div className="mb-3 flex gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-panel px-3">
              <Search className="size-4 shrink-0 text-muted" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search name, set, team…"
                enterKeyHint="search"
                className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
              />
              {query ? (
                <button type="button" aria-label="Clear search" className="grid size-8 place-items-center text-muted" onClick={() => setQuery("")}>
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-label="Filters"
              className="relative inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-line bg-panel px-3 text-sm font-semibold"
            >
              <SlidersHorizontal className="size-4" />
              Filters
              {filterCount ? (
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-[#FF6B35] text-[10px] font-bold text-white">
                  {filterCount}
                </span>
              ) : null}
            </button>
          </div>
          <div className="mb-3 hidden md:block">
            <SegmentedControl
              scrollable
              aria-label="Category filter"
              value={filter}
              onChange={setFilter}
              options={(["All", ...CATEGORIES] as Filter[]).map((f) => ({ value: f, label: f }))}
            />
          </div>
          <div className="mb-3 hidden md:block">
            <SegmentedControl
              scrollable
              aria-label="Status filter"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All status" },
                { value: "owned", label: "Owned" },
                { value: "wishlist", label: "Wishlist" },
              ]}
            />
          </div>
          <div className="mb-3 hidden md:block">
            <SegmentedControl
              scrollable
              aria-label="Kind filter"
              value={kindFilter}
              onChange={setKindFilter}
              options={[
                { value: "all", label: "All kinds" },
                { value: "single", label: "Singles" },
                { value: "sealed", label: "Sealed" },
              ]}
            />
          </div>
          <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
            <select value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setView("list"); }} className="h-11 rounded-xl border border-line bg-panel px-3 text-sm font-semibold">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
              <option value="year">Year</option>
              <option value="set">Set</option>
              <option value="value">Value</option>
            </select>
            <button type="button" onClick={exportJson} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-panel px-3 text-sm font-semibold">
              <Download className="size-4" /> JSON
            </button>
            <button type="button" onClick={exportCsv} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-panel px-3 text-sm font-semibold">
              <Download className="size-4" /> CSV
            </button>
            <button type="button" onClick={() => importRef.current?.click()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-panel px-3 text-sm font-semibold">
              <Upload className="size-4" /> Import
            </button>
            <button type="button" onClick={copyShare} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-panel px-3 text-sm font-semibold">
              Copy list
            </button>
          </div>
          <p className="mb-3 text-sm text-muted">
            {shown.length} card{shown.length === 1 ? "" : "s"}
            {shown.length !== cards.length ? ` of ${cards.length}` : ""}
          </p>
          {shown.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line bg-panel px-4 py-10 text-center text-sm text-muted">Nothing here yet. Tap Scan to add your first card.</p>
          ) : view === "sets" ? (
            <SetsView
              sets={setGroups}
              cards={cards}
              isPro={isPro}
              onOpenCard={openCard}
            />
          ) : view === "stacks" ? (
            isPro ? (
              <StacksView stacks={stackGroups} onOpenCard={openCard} />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  Organize cards into stacks — tag them when editing a card&apos;s Stack field.
                </p>
                <ProUpgradeCard
                  isPro={false}
                  trialDaysLeft={null}
                  onStartTrial={beginProTrial}
                  compact
                />
              </div>
            )
          ) : view === "catalog" ? (
            <div className="grid grid-cols-3 gap-2">
              {shown.map((c) => (
                <CollectionCardTile key={c.id} card={c} onClick={() => openCard(c)} />
              ))}
            </div>
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
                        draggable={Boolean(c)}
                        onClick={() => c && openCard(c)}
                        onDragStart={(e) => {
                          if (!c) return;
                          e.dataTransfer.setData("text/plain", c.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const id = e.dataTransfer.getData("text/plain");
                          const moving = cards.find((row) => row.id === id);
                          if (!moving) return;
                          void persist({ ...moving, page: i + 1, pocket: p, status: "owned", kind: "single" });
                        }}
                        className={cn("min-w-0 overflow-hidden rounded-sm border border-line bg-pocket p-1 text-left sm:p-2", !c && "opacity-40")}
                      >
                        {c ? (
                          <FlipThumb front={c.image} back={c.imageBack} />
                        ) : (
                          <div className="mb-1 aspect-[5/7] grid place-items-center rounded-sm bg-raised text-[10px] text-muted">
                            {p + 1}
                          </div>
                        )}
                        <p className="truncate text-[11px] font-bold leading-tight sm:text-xs">{c?.name || ""}</p>
                        <p className="hidden truncate text-xs text-muted sm:block">
                          {c ? [c.year, c.brand, c.number ? `#${c.number}` : "", c.value].filter(Boolean).join(" · ") : `Pocket ${p + 1}`}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {shown.some((c) => c.kind === "sealed" && c.status === "owned") ? (
                <ListBlock title="Sealed product" cards={shown.filter((c) => c.kind === "sealed" && c.status === "owned")} onOpen={openCard} />
              ) : null}
              {shown.some((c) => c.status === "wishlist") ? (
                <ListBlock title="Wishlist" cards={shown.filter((c) => c.status === "wishlist")} onOpen={openCard} />
              ) : null}
            </div>
          ) : (
            <ListBlock title="List" cards={shown} onOpen={openCard} />
          )}
        </div>
      )}

      {filtersOpen ? (
        <div className="fixed inset-0 z-40 bg-bg/70" onClick={() => setFiltersOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-auto rounded-t-2xl border border-line bg-panel p-5"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg">Filters</h2>
              <button type="button" className="grid size-11 place-items-center" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <X className="size-5" />
              </button>
            </div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Category</p>
            <SegmentedControl
              scrollable
              aria-label="Category filter"
              value={filter}
              onChange={setFilter}
              options={(["All", ...CATEGORIES] as Filter[]).map((f) => ({ value: f, label: f }))}
              className="mb-4"
            />
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Status</p>
            <SegmentedControl
              scrollable
              aria-label="Status filter"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All" },
                { value: "owned", label: "Owned" },
                { value: "wishlist", label: "Wishlist" },
              ]}
              className="mb-4"
            />
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Kind</p>
            <SegmentedControl
              scrollable
              aria-label="Kind filter"
              value={kindFilter}
              onChange={setKindFilter}
              options={[
                { value: "all", label: "All" },
                { value: "single", label: "Singles" },
                { value: "sealed", label: "Sealed" },
              ]}
              className="mb-4"
            />
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Sort</p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="mb-4 h-11 w-full rounded-md border border-line bg-pocket px-3 text-sm font-semibold"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
              <option value="year">Year</option>
              <option value="set">Set</option>
              <option value="value">Value</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFilter("All");
                  setStatusFilter("all");
                  setKindFilter("all");
                }}
                className="h-11 rounded-md border border-line text-sm font-semibold"
              >
                Clear
              </button>
              <button type="button" onClick={() => setFiltersOpen(false)} className="h-11 rounded-xl bg-binder-blue text-sm font-semibold text-white">
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exportGateOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-6">
          <div className="w-full max-w-lg rounded-t-2xl bg-panel p-5 sm:rounded-2xl">
            <h2 className="font-display text-lg font-bold">Integrity issues found</h2>
            <p className="mt-2 text-sm text-muted">
              Exporting now may include invalid or duplicate records. Fix issues in your collection, or export anyway.
            </p>
            {integrityReport && !integrityReport.ok ? (
              <ul className="mt-3 max-h-28 space-y-1 overflow-y-auto rounded-md border border-binder-orange/30 bg-binder-orange/5 px-3 py-2 text-xs">
                {integrityReport.issues.slice(0, 5).map((issue) => (
                  <li key={issue}>• {issue}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportGateOpen(null)}
                className="h-11 rounded-xl border border-line text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={exportDespiteIssues}
                className="btn-binder-accent h-11 text-sm"
              >
                Export anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {syncConflicts.length ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-6">
          <div className="max-h-[85dvh] w-full max-w-lg overflow-auto rounded-t-2xl bg-panel p-5 sm:rounded-2xl">
            <h2 className="font-display text-lg font-bold">Sync conflict</h2>
            <p className="mt-2 text-sm text-muted">
              {syncConflicts.length} card{syncConflicts.length === 1 ? "" : "s"} changed on this device and in the cloud. Choose which version to keep.
            </p>
            <ul className="mt-4 space-y-3">
              {syncConflicts.map(({ local, remote }) => (
                <li key={local.id} className="rounded-xl border border-line p-3 text-sm">
                  <p className="font-bold">{local.name}</p>
                  <div className="mt-2 grid gap-2">
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-line p-2">
                      <input
                        type="radio"
                        name={`sync-${local.id}`}
                        checked={conflictPicks[local.id] === "local"}
                        onChange={() => setConflictPicks((p) => ({ ...p, [local.id]: "local" }))}
                      />
                      <span>
                        This device · {local.value || "no value"} · {local.condition || "—"}
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-line p-2">
                      <input
                        type="radio"
                        name={`sync-${local.id}`}
                        checked={conflictPicks[local.id] === "remote"}
                        onChange={() => setConflictPicks((p) => ({ ...p, [local.id]: "remote" }))}
                      />
                      <span>
                        Cloud · {remote.value || "no value"} · {remote.condition || "—"}
                      </span>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void resolveConflicts(conflictPicks)}
              className="mt-4 h-12 w-full rounded-xl bg-binder-blue text-sm font-bold text-white"
            >
              Apply choices
            </button>
          </div>
        </div>
      ) : null}

      {paywall ? (
        <ProPaywall
          title={PAYWALL_COPY[paywall].title}
          message={PAYWALL_COPY[paywall].message}
          onStartTrial={beginProTrial}
          onCheckout={() => void startStripeCheckout()}
          onClose={() => setPaywall(null)}
        />
      ) : null}

      {detail ? (
        <CardDetailSheet
          card={cards.find((c) => c.id === detail.id) || detail}
          pricing={pricing}
          onClose={() => setDetail(null)}
          onEdit={() => {
            const live = cards.find((c) => c.id === detail.id) || detail;
            setEditing(live);
            setDetail(null);
          }}
          onDelete={() => setConfirmId(detail.id)}
          onLookupPrice={() => {
            const live = cards.find((c) => c.id === detail.id) || detail;
            void priceDraft(live, async (next) => {
              const saved = { ...live, ...next, updatedAt: Date.now() };
              await persist(saved);
              setDetail(saved);
            });
          }}
          onToggleWishlist={() => {
            const live = cards.find((c) => c.id === detail.id) || detail;
            void persist({
              ...live,
              status: live.status === "wishlist" ? "owned" : "wishlist",
            }).then(() => {
              setDetail({ ...live, status: live.status === "wishlist" ? "owned" : "wishlist" });
            });
          }}
          onToggleTrade={() => {
            const live = cards.find((c) => c.id === detail.id) || detail;
            const nextStatus = live.tradeStatus === "for_trade" ? "none" : "for_trade";
            void persist({ ...live, tradeStatus: nextStatus }).then(() => {
              setDetail({ ...live, tradeStatus: nextStatus });
            });
          }}
          onToggleWant={() => {
            const live = cards.find((c) => c.id === detail.id) || detail;
            const nextStatus = live.tradeStatus === "want" ? "none" : "want";
            void persist({ ...live, tradeStatus: nextStatus }).then(() => {
              setDetail({ ...live, tradeStatus: nextStatus });
            });
          }}
        />
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 p-0 sm:items-center sm:p-6">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-t-lg border border-line bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg">Edit card</h2>
              <button type="button" className="grid size-11 place-items-center" onClick={() => setEditing(null)}>
                <X className="size-5" />
              </button>
            </div>
            <CardPhotos
              front={editing.image}
              back={editing.imageBack}
              onFront={(image) => setEditing({ ...editing, image })}
              onBack={(imageBack) => setEditing({ ...editing, imageBack })}
            />
            {editDup ? (
              <p className="mb-3 rounded-sm bg-raised px-3 py-2 text-sm text-accent-2">Duplicate of {editDup.name} already in the binder.</p>
            ) : null}
            <CardForm values={editing} onChange={(v) => setEditing({ ...editing, ...v })} {...stackFormProps} />
            <MarketLinks card={editing} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={saveEdit} className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white">Save</button>
              <button type="button" disabled={pricing} onClick={() => editing && priceDraft(editing, (v) => setEditing({ ...editing, ...v }))} className="h-11 rounded-md border border-line px-4 text-sm font-semibold">
                {pricing ? "Looking up…" : "Lookup price"}
              </button>
              <button type="button" onClick={() => setConfirmId(editing.id)} className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-danger">
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
            <p className="mt-2 text-sm text-muted">You can undo from the toast.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => remove(confirmId)} className="h-11 rounded-md bg-danger px-4 text-sm font-semibold text-ink">Delete</button>
              <button type="button" onClick={() => setConfirmId(null)} className="h-11 rounded-md border border-line px-4 text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed inset-x-4 z-50 flex items-center justify-between gap-3 rounded-md border border-line bg-raised px-4 py-3 text-sm max-md:bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:right-4 md:bottom-4 md:left-auto md:w-96">
          <span>{toast}</span>
          {undo ? (
            <button type="button" className="font-semibold text-accent-2" onClick={() => void undoDelete()}>Undo</button>
          ) : null}
        </div>
      ) : null}

      <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />

      <BinderClipSectionEnd />
      <EmbossedSealFooter />

      <BottomNav
        screen={tab}
        view={view}
        searchActive={searchFocused}
        onHome={goHome}
        onSearch={goSearch}
        onScan={() => setTab("scan")}
        onSets={goSets}
        onProfile={() => {
          setSocialOpen(false);
          setTab("settings");
        }}
      />
    </div>
  );
}

const PAYWALL_COPY: Record<PaywallReason, { title: string; message: string }> = {
  limit: {
    title: "500 cards on Free forever",
    message: "Upgrade to Pro for unlimited collection size. Free still includes unlimited scans. 14-day Pro trial, then $5.99/month.",
  },
  export: {
    title: "Export is a Pro feature",
    message: "Download CSV or JSON backups with Pro. Free includes unlimited scans and portfolio tracking. Try 14 days free.",
  },
  refresh: {
    title: "Bulk price refresh",
    message: "Update market values for your whole collection at once. Free includes unlimited scans and single-card pricing.",
  },
  stacks: {
    title: "Stacks help you organize",
    message: "Group cards into custom stacks — tag them when editing. Pro feature with a 14-day free trial ($5.99/mo after).",
  },
  checklist: {
    title: "Print set checklists",
    message: "Print checklists for any set in your collection. Pro feature — start your 14-day free trial.",
  },
};

function withUntitledName(draft: CardDraft, index = 0): CardDraft {
  if (draft.name.trim()) return draft;
  return { ...draft, name: `Untitled card ${index + 1}` };
}

const SCAN_STEP_LABELS = ["Snap", "Identify", "Price", "Add"] as const;

function ScanSteps({ active }: { active: number }) {
  return (
    <ol className="mt-2 flex gap-1">
      {SCAN_STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const done = active > step;
        const current = active === step;
        return (
          <li
            key={label}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide",
              done
                ? "bg-binder-blue/10 text-binder-blue"
                : current
                  ? "bg-binder-blue/15 text-ink ring-1 ring-binder-blue/35"
                  : "bg-raised text-muted",
            )}
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full text-[11px] font-bold tabular-nums",
                done || current ? "bg-binder-blue text-white" : "bg-panel text-muted",
              )}
            >
              {step}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function MarketLinks({ card }: { card: CardDraft }) {
  const generated = marketplaceUrls(card);
  const urls = {
    tcgplayerUrl: card.tcgplayerUrl || generated.tcgplayerUrl,
    ebayUrl: card.ebayUrl || generated.ebayUrl,
    pricechartingUrl: card.pricechartingUrl || generated.pricechartingUrl,
    comcUrl: card.comcUrl || generated.comcUrl,
    point130Url: card.point130Url || generated.point130Url,
  };
  if (!card.name.trim()) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-sm">
      {card.marketSource ? <span className="text-muted">{card.marketSource}</span> : null}
      <a className="inline-flex items-center gap-1 text-accent-2" href={urls.tcgplayerUrl} target="_blank" rel="noreferrer">TCGplayer <ExternalLink className="size-3" /></a>
      <a className="inline-flex items-center gap-1 text-accent-2" href={urls.ebayUrl} target="_blank" rel="noreferrer">eBay sold <ExternalLink className="size-3" /></a>
      <a className="inline-flex items-center gap-1 text-accent-2" href={urls.pricechartingUrl} target="_blank" rel="noreferrer">PriceCharting <ExternalLink className="size-3" /></a>
      <a className="inline-flex items-center gap-1 text-accent-2" href={urls.comcUrl} target="_blank" rel="noreferrer">COMC <ExternalLink className="size-3" /></a>
      <a className="inline-flex items-center gap-1 text-accent-2" href={urls.point130Url} target="_blank" rel="noreferrer">130point <ExternalLink className="size-3" /></a>
    </div>
  );
}

function ListBlock({ title, cards, onOpen }: { title: string; cards: Card[]; onOpen: (c: Card) => void }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{title}</p>
      <div className="space-y-2">
        {cards.map((c) => (
          <button key={c.id} type="button" onClick={() => onOpen(c)} className="flex w-full items-center gap-3 rounded-sm border border-line bg-pocket p-2 text-left">
            {c.image ? <img src={c.image} alt="" className="h-14 w-10 shrink-0 rounded-sm object-cover" /> : <div className="h-14 w-10 shrink-0 rounded-sm bg-raised" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{c.name}</p>
              <p className="truncate text-xs text-muted">
                {[c.year, c.setName, c.number ? `#${c.number}` : "", c.condition, cardValue(c) ? formatMoney(cardValue(c)) : c.value]
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

function PageShot({
  label,
  url,
  onCamera,
  onLibrary,
  onClear,
  children,
}: {
  label: string;
  url: string | null;
  onCamera: () => void;
  onLibrary: () => void;
  onClear: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-pocket p-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      {children}
      {!url ? <div className="mb-2 grid h-28 place-items-center rounded-sm bg-raised text-xs text-muted">No photo</div> : null}
      <div className="mt-2 flex min-w-0 gap-2">
        <button type="button" onClick={onCamera} className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-md bg-accent px-2 text-xs font-semibold text-white">
          <Camera className="size-3.5 shrink-0" /> <span className="truncate">Photo</span>
        </button>
        <button type="button" onClick={onLibrary} className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-line px-2 text-xs font-semibold">
          <FolderOpen className="size-3.5 shrink-0" /> <span className="truncate">Library</span>
        </button>
        {url ? (
          <button type="button" onClick={onClear} className="h-11 rounded-md border border-line px-3 text-xs font-semibold">Clear</button>
        ) : null}
      </div>
    </div>
  );
}

function containMetrics(img: HTMLImageElement) {
  const scale = Math.min(img.clientWidth / img.naturalWidth, img.clientHeight / img.naturalHeight);
  return {
    scale,
    ox: (img.clientWidth - img.naturalWidth * scale) / 2,
    oy: (img.clientHeight - img.naturalHeight * scale) / 2,
  };
}

function CropBox({ crop, img }: { crop: { x: number; y: number; w: number; h: number }; img: HTMLImageElement | null }) {
  if (!img) return null;
  const { ox, oy } = containMetrics(img);
  return <div className="pointer-events-none absolute border-2 border-accent-2 bg-accent/20" style={{ left: crop.x + ox, top: crop.y + oy, width: crop.w, height: crop.h }} />;
}

function NineGuide({ img }: { img: HTMLImageElement | null }) {
  if (!img?.naturalWidth) return null;
  const { scale, ox, oy } = containMetrics(img);
  return (
    <div className="pointer-events-none absolute grid grid-cols-3 grid-rows-3" style={{ left: ox + img.naturalWidth * 0.03 * scale, top: oy + img.naturalHeight * 0.03 * scale, width: img.naturalWidth * 0.94 * scale, height: img.naturalHeight * 0.94 * scale }}>
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
