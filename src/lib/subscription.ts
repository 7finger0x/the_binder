export const PRO_MONTHLY_USD = 5.99;
export const PRO_TRIAL_DAYS = 14;
export const FREE_CARD_LIMIT = 500;
/** Free tier has no scan counter — scans are unlimited. */
export const FREE_SCAN_UNLIMITED = true;

export const COLLX_PRO_MONTHLY_USD = 9.99;
export const COLLX_TRIAL_DAYS = 7;

const STORAGE_KEY = "the-binder-pro";

export type ProStatus = "free" | "trial" | "pro";

export type ProState = {
  status: ProStatus;
  trialEndsAt: number | null;
  subscribedAt: number | null;
};

const DEFAULT_STATE: ProState = {
  status: "free",
  trialEndsAt: null,
  subscribedAt: null,
};

export function readProState(): ProState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as ProState;
    if (parsed.status === "trial" && parsed.trialEndsAt && parsed.trialEndsAt < Date.now()) {
      return { ...DEFAULT_STATE };
    }
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeProState(state: ProState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function isPro(state: ProState = readProState()) {
  if (state.status === "pro") return true;
  if (state.status === "trial" && state.trialEndsAt && state.trialEndsAt > Date.now()) return true;
  return false;
}

export function startProTrial(): ProState {
  const now = Date.now();
  const next: ProState = {
    status: "trial",
    trialEndsAt: now + PRO_TRIAL_DAYS * 24 * 60 * 60 * 1000,
    subscribedAt: null,
  };
  writeProState(next);
  return next;
}

/** Demo subscribe after trial — wire to Stripe in production. */
export function activateProSubscription(): ProState {
  const next: ProState = {
    status: "pro",
    trialEndsAt: null,
    subscribedAt: Date.now(),
  };
  writeProState(next);
  return next;
}

export function proTrialDaysLeft(state: ProState = readProState()) {
  if (state.status !== "trial" || !state.trialEndsAt) return null;
  const ms = state.trialEndsAt - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function proStatusLabel(state: ProState = readProState()) {
  if (state.status === "pro") return "Pro";
  if (state.status === "trial") {
    const days = proTrialDaysLeft(state);
    return days !== null ? `Pro trial · ${days}d left` : "Pro trial";
  }
  return "Free";
}

export function monthlySavingsVsCollxPro() {
  return COLLX_PRO_MONTHLY_USD - PRO_MONTHLY_USD;
}

export function annualSavingsVsCollxPro(months = 12) {
  return monthlySavingsVsCollxPro() * months;
}

export function formatProPrice() {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(PRO_MONTHLY_USD);
}

export const PRO_FEATURES = [
  "Unlimited cards (Free caps at 500)",
  "Bulk market price refresh",
  "Stacks view & organization",
  "Printable set checklists",
  "CSV / JSON export",
  "Public share link",
] as const;

export const FREE_FEATURES = [
  "Free forever — $0",
  "Unlimited scans",
  "Portfolio value tracking",
  "Single-card price lookup",
  "Storage locations & binder layout",
  "Up to 500 cards",
] as const;
