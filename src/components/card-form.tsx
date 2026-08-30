import { CATEGORIES, FIELD_DEFS, type Card, type Category } from "@/lib/cards";

type Values = Omit<Card, "id" | "createdAt">;

export function CardForm({
  values,
  onChange,
}: {
  values: Values;
  onChange: (next: Values) => void;
}) {
  function set<K extends keyof Values>(key: K, value: Values[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FIELD_DEFS.map((field) => (
        <label
          key={field.key}
          className={field.kind === "textarea" ? "block sm:col-span-2" : "block"}
        >
          <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">
            {field.label}
          </span>
          {field.kind === "select" ? (
            <select
              value={values.category}
              onChange={(e) => set("category", e.target.value as Category)}
              className="h-11 w-full rounded-sm border border-line bg-pocket px-3 text-ink outline-none focus:border-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : field.kind === "textarea" ? (
            <textarea
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full rounded-sm border border-line bg-pocket px-3 py-2 text-ink outline-none focus:border-accent"
            />
          ) : (
            <input
              value={String(values[field.key] ?? "")}
              onChange={(e) => set(field.key, e.target.value as Values[typeof field.key])}
              className="h-11 w-full rounded-sm border border-line bg-pocket px-3 text-ink outline-none focus:border-accent"
            />
          )}
        </label>
      ))}
    </div>
  );
}
