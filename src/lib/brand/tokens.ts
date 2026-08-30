/** Official "The Card Binder" brand palette — do not substitute. */
export const BRAND = {
  deepBinderBlue: "#0056D6",
  vibrantAccentOrange: "#FF6B35",
  ink: "#0f172a",
  muted: "#64748b",
  panel: "#ffffff",
  bg: "#f0f4fa",
  line: "#e2e8f0",
} as const;

export const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND.deepBinderBlue} 0%, ${BRAND.vibrantAccentOrange} 100%)`;
export const BRAND_GRADIENT_HERO = `linear-gradient(160deg, ${BRAND.deepBinderBlue} 0%, #003d99 45%, #cc4f1a 100%)`;
