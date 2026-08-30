"use client";

import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  scrollable,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  className?: string;
  scrollable?: boolean;
  "aria-label"?: string;
}) {
  const inner = (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-xl border border-line bg-panel p-1",
        scrollable && "min-w-max",
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              "h-9 shrink-0 rounded-lg px-3 text-sm font-semibold transition-colors",
              active ? "bg-binder-blue text-white shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  if (scrollable) {
    return (
      <div className={cn("overflow-x-auto pb-0.5", className)}>
        {inner}
      </div>
    );
  }

  return <div className={className}>{inner}</div>;
}
