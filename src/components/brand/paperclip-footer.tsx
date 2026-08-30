import { cn } from "@/lib/utils";

const CLIP_COLORS = ["#0056D6", "#0056D6", "#7b3fd4", "#FF6B35", "#FF6B35"] as const;

/** Fanned Paperclip Footer — decorative footer accent row. */
export function PaperclipFooter({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-end justify-center gap-1 py-4", className)} aria-hidden>
      {CLIP_COLORS.map((color, i) => (
        <svg
          key={i}
          viewBox="0 0 24 48"
          className="h-8 w-4"
          style={{ transform: `rotate(${(i - 2) * 12}deg)` }}
        >
          <path
            d="M8 4c0-2 2-4 4-4s4 2 4 4v28c0 4-3 7-7 7s-7-3-7-7V12"
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      ))}
    </div>
  );
}
