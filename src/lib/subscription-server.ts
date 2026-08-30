"use server";

import { getSql } from "@/lib/db";
import { requireUserIdForAction } from "@/lib/auth/action-auth";
import { getStripe, isActiveStripeStatus, proPriceId } from "@/lib/stripe";
import { PRO_MONTHLY_USD, PRO_TRIAL_DAYS } from "@/lib/subscription";

export type ServerProStatus = {
  isPro: boolean;
  status: string;
  source: "stripe" | "trial" | "none";
  currentPeriodEnd: string | null;
};

export async function getServerProStatus(bearerToken?: string): Promise<ServerProStatus> {
  try {
    const userId = await requireUserIdForAction(bearerToken);
    const sql = await getSql();
    const rows = await sql<{ status: string; current_period_end: string | null }>`
      select status, current_period_end from subscriptions where user_id = ${userId} limit 1
    `;
    const row = rows[0];
    if (row && isActiveStripeStatus(row.status)) {
      return {
        isPro: true,
        status: row.status,
        source: "stripe",
        currentPeriodEnd: row.current_period_end,
      };
    }
  } catch {
    /* not signed in */
  }
  return { isPro: false, status: "inactive", source: "none", currentPeriodEnd: null };
}

export async function createCheckoutSession(origin: string, bearerToken?: string) {
  const stripe = getStripe();
  const priceId = proPriceId();
  if (!stripe || !priceId) {
    return { ok: false as const, error: "Billing is not configured yet." };
  }

  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();

  const existing = await sql<{ stripe_customer_id: string | null }>`
    select stripe_customer_id from subscriptions where user_id = ${userId} limit 1
  `;
  let customerId = existing[0]?.stripe_customer_id || null;

  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { userId } });
    customerId = customer.id;
    await sql`
      insert into subscriptions (user_id, stripe_customer_id, status)
      values (${userId}, ${customerId}, 'inactive')
      on conflict (user_id) do update set stripe_customer_id = excluded.stripe_customer_id, updated_at = now()
    `;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?pro=success`,
    cancel_url: `${origin}/?pro=cancel`,
    subscription_data: {
      trial_period_days: PRO_TRIAL_DAYS,
      metadata: { userId },
    },
    metadata: { userId },
  });

  return { ok: true as const, url: session.url, amount: PRO_MONTHLY_USD };
}

export async function createBillingPortalSession(origin: string, bearerToken?: string) {
  const stripe = getStripe();
  if (!stripe) return { ok: false as const, error: "Billing is not configured yet." };

  const userId = await requireUserIdForAction(bearerToken);
  const sql = await getSql();
  const rows = await sql<{ stripe_customer_id: string | null }>`
    select stripe_customer_id from subscriptions where user_id = ${userId} limit 1
  `;
  const customerId = rows[0]?.stripe_customer_id;
  if (!customerId) return { ok: false as const, error: "No subscription on file." };

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/`,
  });
  return { ok: true as const, url: session.url };
}

export async function syncStripeSubscription(
  userId: string,
  subscription: {
    id: string;
    status: string;
    current_period_end?: number | null;
    customer?: string | { id?: string } | null;
  },
) {
  const sql = await getSql();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id || null;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  await sql`
    insert into subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, updated_at)
    values (${userId}, ${customerId}, ${subscription.id}, ${subscription.status}, ${periodEnd}::timestamptz, now())
    on conflict (user_id) do update set
      stripe_customer_id = coalesce(excluded.stripe_customer_id, subscriptions.stripe_customer_id),
      stripe_subscription_id = excluded.stripe_subscription_id,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      updated_at = now()
  `;
}
