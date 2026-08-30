import {
  CATEGORIES,
  CONDITIONS,
  CONDITION_LABELS,
  KINDS,
  STATUSES,
  type CardDraft,
  type Category,
  type Kind,
  type Status,
} from "@/lib/cards";

export function CardForm({
  values,
  onChange,
}: {
  values: CardDraft;
  onChange: (next: CardDraft) => void;
}) {
  function set<K extends keyof CardDraft>(key: K, value: CardDraft[K]) {
    onChange({ ...values, [key]: value });
  }

  const sports = values.category === "Sports";
  const tcg = values.category === "Pokémon" || values.category === "TCG";
  const sealed = values.kind === "sealed";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">
          {sealed ? "Product" : sports ? "Name / player" : "Name"}
        </span>
        <input
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          className="h-11 w-full rounded-sm border border-line bg-pocket px-3 text-ink outline-none focus:border-accent"
        />
      </label>

      <FieldSelect
        label="Type"
        value={values.kind}
        onChange={(v) => set("kind", v as Kind)}
        options={KINDS.map((k) => ({ value: k, label: k === "single" ? "Single" : "Sealed (box / pack)" }))}
      />
      <FieldSelect
        label="Status"
        value={values.status}
        onChange={(v) => set("status", v as Status)}
        options={STATUSES.map((s) => ({ value: s, label: s === "owned" ? "Owned" : "Wishlist" }))}
      />
      <FieldSelect
        label="Category"
        value={values.category}
        onChange={(v) => set("category", v as Category)}
        options={CATEGORIES.map((c) => ({ value: c, label: c }))}
      />

      {sports && !sealed ? (
        <>
          <Field label="Team / franchise" value={values.team} onChange={(v) => set("team", v)} />
          <Field label="Position" value={values.position} onChange={(v) => set("position", v)} />
        </>
      ) : null}

      {tcg && !sealed ? (
        <>
          <Field label="HP" value={values.hp} onChange={(v) => set("hp", v)} />
          <Field label="Rarity" value={values.rarity} onChange={(v) => set("rarity", v)} />
        </>
      ) : null}

      {!sports && !tcg && !sealed ? (
        <Field label="Team / franchise" value={values.team} onChange={(v) => set("team", v)} />
      ) : null}

      <Field label="Year" value={values.year} onChange={(v) => set("year", v)} />
      <Field label="Brand" value={values.brand} onChange={(v) => set("brand", v)} />
      <Field label={sealed ? "Product line / set" : "Set"} value={values.setName} onChange={(v) => set("setName", v)} />
      {!sealed ? (
        <>
          <Field label="Card #" value={values.number} onChange={(v) => set("number", v)} />
          <Field label="Variant / parallel" value={values.variant} onChange={(v) => set("variant", v)} />
        </>
      ) : null}

      <FieldSelect
        label="Condition"
        value={values.condition}
        onChange={(v) => set("condition", v)}
        options={[
          { value: "", label: "—" },
          ...CONDITIONS.map((c) => ({ value: c, label: `${c} · ${CONDITION_LABELS[c]}` })),
        ]}
      />
      {values.condition === "Graded" ? (
        <Field label="Grade (PSA 10, BGS 9.5…)" value={values.grade} onChange={(v) => set("grade", v)} />
      ) : null}

      <Field label="Estimated value" value={values.value} onChange={(v) => set("value", v)} />
      <Field label="Quantity" value={values.qty} onChange={(v) => set("qty", v)} />

      {values.status === "owned" && values.kind === "single" ? (
        <>
          <Field
            label="Binder page"
            value={values.page > 0 ? String(values.page) : ""}
            onChange={(v) => set("page", Math.max(0, Number(v) || 0))}
          />
          <FieldSelect
            label="Pocket"
            value={values.pocket >= 0 ? String(values.pocket) : ""}
            onChange={(v) => set("pocket", v === "" ? -1 : Number(v))}
            options={[
              { value: "", label: "Unassigned" },
              ...Array.from({ length: 9 }, (_, i) => ({ value: String(i), label: `Pocket ${i + 1}` })),
            ]}
          />
        </>
      ) : null}

      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">Notes</span>
        <textarea
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className="w-full rounded-sm border border-line bg-pocket px-3 py-2 text-ink outline-none focus:border-accent"
        />
      </label>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-sm border border-line bg-pocket px-3 text-ink outline-none focus:border-accent"
      />
    </label>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-sm border border-line bg-pocket px-3 text-ink outline-none focus:border-accent"
      >
        {options.map((opt) => (
          <option key={opt.value || "empty"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
