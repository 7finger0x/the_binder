/** CollX-style commission: 8% free tier, 5% Pro. */
export const COMMISSION_FREE = 0.08;
export const COMMISSION_PRO = 0.05;

export function listingCommissionRate(isPro: boolean) {
  return isPro ? COMMISSION_PRO : COMMISSION_FREE;
}

export function listingNetProceeds(askingPrice: number, isPro: boolean) {
  const rate = listingCommissionRate(isPro);
  return Math.max(0, askingPrice * (1 - rate));
}

export function listingNetProceedsFromRate(askingPrice: number, commissionRate: number) {
  return Math.max(0, askingPrice * (1 - commissionRate));
}
