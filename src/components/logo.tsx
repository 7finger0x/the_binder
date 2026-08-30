import { useId } from "react";
import { cn } from "@/lib/utils";

const BINDER_B =
  "M40 24h28a21 21 0 0 1 0 42h4a22 22 0 0 1 0 44H40V24Zm16 12v16h10a8 8 0 0 0 0-16H56Zm0 36v20h14a10 10 0 0 0 0-20H56Z";

function BinderMarkSvg({
  className,
  title,
  gradientId,
}: {
  className?: string;
  title?: string;
  gradientId: string;
}) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0056D6" />
          <stop offset="1" stopColor="#FF6B35" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill={`url(#${gradientId})`} />
      <g fill="#fff">
        <rect x="22" y="39" width="24" height="12" rx="6" />
        <rect x="22" y="82" width="24" height="12" rx="6" />
        <path fillRule="evenodd" d={BINDER_B} />
      </g>
    </svg>
  );
}

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const id = useId();
  return <BinderMarkSvg className={className} title={title} gradientId={`${id}-binder-bg`} />;
}

export function LogoLockup({
  className,
  showTagline = false,
  markClassName,
  titleAs: Title = "div",
  inverted = false,
}: {
  className?: string;
  showTagline?: boolean;
  markClassName?: string;
  titleAs?: "div" | "h1";
  inverted?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark className={cn("size-9 shrink-0", markClassName)} />
      <div className="min-w-0 leading-tight">
        <Title className={cn("font-sans text-xl font-bold tracking-tight [font-family:var(--font-sans)]", inverted ? "text-white" : "text-ink")}>
          The Card Binder
        </Title>
        {showTagline ? (
          <p className={cn("mt-0.5 text-xs font-medium", inverted ? "text-white/80" : "text-muted")}>
            Your Digital Card Catalog
          </p>
        ) : null}
      </div>
    </div>
  );
}
