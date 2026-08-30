export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tcb-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a1f2e" />
          <stop offset="1" stopColor="#12151c" />
        </linearGradient>
        <linearGradient id="tcb-foil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9ec0ff" />
          <stop offset="0.45" stopColor="#5b8cff" />
          <stop offset="1" stopColor="#3d6fe0" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill="url(#tcb-bg)" />
      <rect x="1.25" y="1.25" width="125.5" height="125.5" rx="26.75" fill="none" stroke="#2d3548" strokeWidth="2.5" />
      <g fill="none" stroke="#8b95ab" strokeWidth="3">
        <circle cx="16" cy="32" r="6" />
        <circle cx="16" cy="64" r="6" />
        <circle cx="16" cy="96" r="6" />
      </g>
      <rect x="32" y="20" width="24" height="28" rx="4.5" fill="#0e121b" stroke="#2d3548" strokeWidth="1.5" />
      <rect x="60" y="20" width="24" height="28" rx="4.5" fill="#0e121b" stroke="#2d3548" strokeWidth="1.5" />
      <rect x="88" y="20" width="24" height="28" rx="4.5" fill="#0e121b" stroke="#2d3548" strokeWidth="1.5" />
      <rect x="32" y="52" width="24" height="28" rx="4.5" fill="#0e121b" stroke="#2d3548" strokeWidth="1.5" />
      <rect x="59" y="50" width="26" height="32" rx="5.5" fill="url(#tcb-foil)" stroke="#c9dbff" strokeWidth="1.25" />
      <path d="M63 54 L81 74" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="5.5" strokeLinecap="round" />
      <rect x="88" y="52" width="24" height="28" rx="4.5" fill="#0e121b" stroke="#2d3548" strokeWidth="1.5" />
      <rect x="32" y="84" width="24" height="28" rx="4.5" fill="#0e121b" stroke="#2d3548" strokeWidth="1.5" />
      <rect x="60" y="84" width="24" height="28" rx="4.5" fill="#0e121b" stroke="#2d3548" strokeWidth="1.5" />
      <rect x="88" y="84" width="24" height="28" rx="4.5" fill="#0e121b" stroke="#2d3548" strokeWidth="1.5" />
    </svg>
  );
}
