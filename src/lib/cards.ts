export const CATEGORIES = ["Sports", "Pokémon", "TCG", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Card = {
  id: string;
  name: string;
  team: string;
  year: string;
  brand: string;
  setName: string;
  number: string;
  variant: string;
  category: Category;
  condition: string;
  value: string;
  notes: string;
  image: string;
  createdAt: number;
};

export const EMPTY_CARD: Omit<Card, "id" | "createdAt"> = {
  name: "",
  team: "",
  year: "",
  brand: "",
  setName: "",
  number: "",
  variant: "",
  category: "Sports",
  condition: "",
  value: "",
  notes: "",
  image: "",
};

export const FIELD_DEFS: { key: keyof typeof EMPTY_CARD; label: string; kind: "text" | "select" | "textarea" }[] = [
  { key: "name", label: "Name / player", kind: "text" },
  { key: "team", label: "Team / franchise", kind: "text" },
  { key: "year", label: "Year", kind: "text" },
  { key: "brand", label: "Brand", kind: "text" },
  { key: "setName", label: "Set", kind: "text" },
  { key: "number", label: "Card #", kind: "text" },
  { key: "variant", label: "Variant / parallel", kind: "text" },
  { key: "category", label: "Category", kind: "select" },
  { key: "condition", label: "Condition", kind: "text" },
  { key: "value", label: "Estimated value", kind: "text" },
  { key: "notes", label: "Notes", kind: "textarea" },
];

export function uid() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}
