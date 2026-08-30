import { cn } from "@/lib/utils";

/** Binder Ring Header — section divider with central metallic ring accent. */
export function BinderRingHeader({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("relative flex items-center gap-3 py-2", className)}>
      <div className="relative h-8 min-w-0 flex-1">
        <svg viewBox="0 0 200 32" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
          <path
            d="M 0 24 Q 90 4 100 16"
            fill="none"
            stroke="#0056D6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 100 16 Q 110 28 200 24"
            fill="none"
            stroke="#FF6B35"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <span
          className="absolute top-1/2 left-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-300 bg-gradient-to-br from-slate-100 to-slate-300 shadow-sm"
          aria-hidden
        >
          <span className="size-2.5 rounded-full border border-slate-400 bg-slate-200" />
        </span>
      </div>
      <h2 className="shrink-0 font-sans text-sm font-bold tracking-tight text-ink uppercase">{title}</h2>
      <div className="relative h-8 min-w-0 flex-1 scale-x-[-1]">
        <svg viewBox="0 0 200 32" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
          <path
            d="M 0 24 Q 90 4 100 16"
            fill="none"
            stroke="#0056D6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 100 16 Q 110 28 200 24"
            fill="none"
            stroke="#FF6B35"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
