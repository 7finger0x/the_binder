"use client";

import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrityReport } from "@/lib/pipeline/types";
import { HeaderLineWithMarker } from "@/components/brand";

export function IntegrityPanel({
  report,
  checking,
  onRecheck,
  className,
}: {
  report: IntegrityReport;
  checking?: boolean;
  onRecheck?: () => void;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-panel p-4", className)}>
      <HeaderLineWithMarker className="mb-3" markerPosition={report.ok ? 0.85 : 0.15} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {report.ok ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-binder-blue" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-binder-orange" aria-hidden />
          )}
          <div>
            <h2 className="font-display text-lg">Collection integrity</h2>
            <p className="mt-1 text-sm text-muted">
              {report.ok
                ? `${report.cardCount} card${report.cardCount === 1 ? "" : "s"} passed all checks.`
                : `${report.issues.length + report.duplicateIds.length} issue${report.issues.length + report.duplicateIds.length === 1 ? "" : "s"} found — fix before exporting.`}
            </p>
          </div>
        </div>
        {onRecheck ? (
          <button
            type="button"
            onClick={onRecheck}
            disabled={checking}
            aria-label="Re-run integrity check"
            className="grid size-10 shrink-0 place-items-center rounded-md border border-line bg-raised text-muted disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", checking && "animate-spin")} />
          </button>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-pocket px-2 py-2">
          <dt className="font-medium text-muted">Cards</dt>
          <dd className="mt-0.5 text-base font-bold tabular-nums text-ink">{report.cardCount}</dd>
        </div>
        <div className="rounded-md bg-pocket px-2 py-2">
          <dt className="font-medium text-muted">Duplicates</dt>
          <dd className={cn("mt-0.5 text-base font-bold tabular-nums", report.duplicateIds.length ? "text-binder-orange" : "text-ink")}>
            {report.duplicateIds.length}
          </dd>
        </div>
        <div className="rounded-md bg-pocket px-2 py-2">
          <dt className="font-medium text-muted">Invalid</dt>
          <dd className={cn("mt-0.5 text-base font-bold tabular-nums", report.orphanedRefs ? "text-binder-orange" : "text-ink")}>
            {report.orphanedRefs}
          </dd>
        </div>
      </dl>

      {!report.ok && report.issues.length > 0 ? (
        <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded-md border border-binder-orange/30 bg-binder-orange/5 px-3 py-2 text-xs text-ink">
          {report.issues.slice(0, 8).map((issue) => (
            <li key={issue}>• {issue}</li>
          ))}
          {report.issues.length > 8 ? (
            <li className="text-muted">…and {report.issues.length - 8} more</li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}
