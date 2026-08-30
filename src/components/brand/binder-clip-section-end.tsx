import { cn } from "@/lib/utils";

/** Section End — Vibrant Accent Orange binder clip closure accent. */
export function BinderClipSectionEnd({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center py-3", className)} aria-hidden>
      <svg viewBox="0 0 48 56" className="h-10 w-9 drop-shadow-md" fill="none">
        <path
          d="M8 8h32a4 4 0 0 1 4 4v36a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z"
          fill="#FF6B35"
        />
        <path d="M12 20h24v4H12z" fill="#e55a28" />
        <ellipse cx="24" cy="14" rx="10" ry="4" fill="#cc4f1a" />
        <circle cx="24" cy="10" r="3" fill="#fff" opacity="0.35" />
      </svg>
    </div>
  );
}
