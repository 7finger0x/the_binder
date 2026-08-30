import { NextResponse } from "next/server";
import { createBillingPortalSession } from "@/lib/subscription-server";

function bearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const token = bearerToken(req);
  const result = await createBillingPortalSession(origin, token);
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
