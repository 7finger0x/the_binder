import { NextResponse } from "next/server";
import { lookupComps } from "@/lib/comps";
import type { MarketLookupInput } from "@/lib/cards";

export async function POST(req: Request) {
  let body: MarketLookupInput;
  try {
    body = (await req.json()) as MarketLookupInput;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const result = await lookupComps(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
