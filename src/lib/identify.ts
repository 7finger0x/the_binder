import { createServerFn } from "@tanstack/react-start";
import { isCategory, type Category } from "./cards";

export type Identified = {
  name: string;
  team: string;
  year: string;
  brand: string;
  setName: string;
  number: string;
  variant: string;
  category: Category;
};

function parseCardArray(text: string): Identified[] {
  if (!text) return [];
  let raw = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = raw.indexOf("[");
  if (start === -1) return [];
  raw = raw.slice(start);
  try {
    const v = JSON.parse(raw) as unknown;
    if (Array.isArray(v)) return v.map(normalize).filter(Boolean) as Identified[];
  } catch {
    /* repair truncated */
  }
  const objs: Identified[] = [];
  let depth = 0;
  let buf = "";
  let inStr = false;
  let esc = false;
  for (const ch of raw) {
    if (inStr) {
      buf += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      buf += ch;
      continue;
    }
    if (ch === "{") {
      depth++;
      buf += ch;
      continue;
    }
    if (ch === "}") {
      depth--;
      buf += ch;
      if (depth === 0) {
        try {
          const n = normalize(JSON.parse(buf));
          if (n) objs.push(n);
        } catch {
          /* skip */
        }
        buf = "";
      }
      continue;
    }
    if (depth > 0) buf += ch;
  }
  return objs;
}

function normalize(raw: unknown): Identified | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const name = String(p.name || "").trim();
  if (!name) return null;
  const cat = String(p.category || "Other");
  return {
    name,
    team: String(p.team || ""),
    year: String(p.year || ""),
    brand: String(p.brand || ""),
    setName: String(p.setName || p.set || ""),
    number: String(p.number || p.cardNumber || ""),
    variant: String(p.variant || ""),
    category: isCategory(cat) ? cat : "Other",
  };
}

export const identifyPage = createServerFn({ method: "POST" })
  .validator((input: { image: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "Identify is not available in this environment." };
    }
    if (!data.image || data.image.length > 1_800_000) {
      return { ok: false as const, error: "Photo is too large. Try a smaller page or crop closer." };
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 1200,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: data.image } },
              {
                type: "text",
                text: "Identify every trading card visible (sports, Pokémon, TCG, other collectibles). Reply with ONLY a minified JSON array of objects with keys: name,team,year,brand,setName,number,variant,category (Sports|Pokémon|TCG|Other). Leave unknown fields empty. Do not guess condition or value.",
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false as const, error: `Identify failed (${res.status}). Try fewer cards or a clearer photo.` };
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content ?? "";
    const cards = parseCardArray(text);
    if (!cards.length) {
      return {
        ok: false as const,
        error: "Couldn't read that page clearly. Try a straighter angle, even lighting, or fewer cards per scan.",
      };
    }
    return { ok: true as const, cards };
  });
