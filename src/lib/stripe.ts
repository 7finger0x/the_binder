import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
}

export function proPriceId() {
  return process.env.STRIPE_PRO_PRICE_ID?.trim() || "";
}

export function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
}

export function isActiveStripeStatus(status: string) {
  return status === "active" || status === "trialing";
}

/** Stripe moved period end onto subscription items in newer API versions. */
export function subscriptionPeriodEnd(sub: Stripe.Subscription): number | null {
  const items = sub.items?.data;
  if (!items?.length) return null;
  const ends = items.map((item) => item.current_period_end).filter((n) => Number.isFinite(n));
  return ends.length ? Math.max(...ends) : null;
}
