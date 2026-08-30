import { cn } from "@/lib/utils";

/** Header Line w/ Marker — brand divider with sliding marker element. */
export function HeaderLineWithMarker({
  className,
  markerPosition = 0.35,
  label,
}: {
  className?: string;
  /** 0–1 position along the line for the marker sphere. */
  markerPosition?: number;
  label?: string;
}) {
  const pct = `${Math.min(1, Math.max(0, markerPosition)) * 100}%`;
  return (
    <div className={cn("relative w-full", className)} role="separator" aria-label={label}>
      <div className="relative h-px w-full overflow-visible">
        <div
          className="absolute inset-y-0 left-0 h-px bg-binder-blue"
          style={{ width: pct }}
        />
        <div
          className="absolute inset-y-0 right-0 h-px bg-line"
          style={{ left: pct }}
        />
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-[0_2px_8px_rgba(0,86,214,0.35)]"
          style={{ left: pct }}
          aria-hidden
        />
      </div>
    </div>
  );
}
