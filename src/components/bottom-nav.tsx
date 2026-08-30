import { Camera, Grid3x3, Layers, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppScreen = "scan" | "collection" | "settings";
export type CollectionView = "catalog" | "binder" | "list" | "sets" | "stacks";

export function BottomNav({
  screen,
  view,
  searchActive,
  onHome,
  onSearch,
  onScan,
  onSets,
  onProfile,
}: {
  screen: AppScreen;
  view: CollectionView;
  searchActive: boolean;
  onHome: () => void;
  onSearch: () => void;
  onScan: () => void;
  onSets: () => void;
  onProfile: () => void;
}) {
  const homeOn = screen === "collection" && view === "catalog" && !searchActive;
  const setsOn = screen === "collection" && (view === "sets" || view === "stacks") && !searchActive;
  const searchOn = screen === "collection" && searchActive;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 items-center px-1">
        <NavItem label="Collection" active={homeOn} onClick={onHome} icon={Grid3x3} />
        <NavItem label="Search" active={searchOn} onClick={onSearch} icon={Search} />
        <button
          type="button"
          onClick={onScan}
          aria-label="Scan cards"
          aria-current={screen === "scan" ? "page" : undefined}
          className={cn(
            "-mt-5 grid size-14 place-items-center justify-self-center rounded-full text-white shadow-[0_8px_24px_rgba(0,86,214,0.45)]",
            screen === "scan" ? "bg-binder-orange" : "bg-binder-blue",
          )}
        >
          <Camera className="size-6" strokeWidth={2.25} />
        </button>
        <NavItem label="Sets" active={setsOn} onClick={onSets} icon={Layers} />
        <NavItem label="Profile" active={screen === "settings"} onClick={onProfile} icon={User} />
      </div>
    </nav>
  );
}

function NavItem({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: typeof Grid3x3;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
        active ? "text-binder-blue" : "text-muted",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
      {label}
    </button>
  );
}
