import { NextResponse } from "next/server";
import { lookupMarket } from "@/lib/market";
import type { MarketLookupInput } from "@/lib/cards";

export async function POST(req: Request) {
  let body: MarketLookupInput;
  try {
    body = (await req.json()) as MarketLookupInput;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const result = await lookupMarket(body);
  return NextResponse.json(result);
}
