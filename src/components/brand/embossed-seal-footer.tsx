import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

/** Embossed Seal Footer — circular metallic seal with binder mark. */
export function EmbossedSealFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn("flex flex-col items-center gap-2 py-6", className)}
      aria-label="The Card Binder"
    >
      <div className="relative grid size-14 place-items-center rounded-full border border-slate-300 bg-gradient-to-br from-slate-100 via-white to-slate-200 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_4px_12px_rgba(15,23,42,0.12)]">
        <LogoMark className="size-8 opacity-90" />
      </div>
      <p className="text-xs font-semibold tracking-wide text-muted">The Card Binder</p>
    </footer>
  );
}
