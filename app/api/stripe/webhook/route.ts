import { NextResponse } from "next/server";
import { getStripe, stripeWebhookSecret, subscriptionPeriodEnd } from "@/lib/stripe";
import { syncStripeSubscription } from "@/lib/subscription-server";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = stripeWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (userId && subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      await syncStripeSubscription(userId, {
        id: sub.id,
        status: sub.status,
        current_period_end: subscriptionPeriodEnd(sub),
        customer: sub.customer,
      });
    }
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) {
      await syncStripeSubscription(userId, {
        id: sub.id,
        status: sub.status,
        current_period_end: subscriptionPeriodEnd(sub),
        customer: sub.customer,
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) {
      await syncStripeSubscription(userId, {
        id: sub.id,
        status: "canceled",
        current_period_end: subscriptionPeriodEnd(sub),
        customer: sub.customer,
      });
    }
  }

  return NextResponse.json({ received: true });
}
