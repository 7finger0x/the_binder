import Link from "next/link";
import { listFeaturedShowcases } from "@/lib/cloud";
import { showcaseInitials } from "@/lib/showcase";
import { LogoLockup } from "@/components/logo";

export const dynamic = "force-dynamic";

export default async function FeaturedPage() {
  const showcases = await listFeaturedShowcases();

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex items-center gap-3 border-b border-line pb-4">
        <Link href="/" className="min-w-0 flex-1">
          <LogoLockup showTagline titleAs="h1" />
        </Link>
      </header>
      <h1 className="font-display text-2xl font-bold">Featured collections</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Curated collector showcases from The Binder community.
      </p>
      {showcases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-4 py-12 text-center">
          <p className="text-sm text-muted">No featured showcases yet.</p>
          <p className="mt-2 text-sm">
            <Link href="/" className="font-semibold text-accent-2">
              Create your showcase
            </Link>{" "}
            and share your binder.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {showcases.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/c/${s.slug}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-panel p-4 transition hover:border-collx-green/40"
              >
                {s.avatarUrl ? (
                  <img src={s.avatarUrl} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-collx-green/15 text-sm font-bold text-collx-green">
                    {showcaseInitials(s.displayName)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{s.displayName}</p>
                  {s.name ? <p className="text-xs font-semibold text-accent-2">{s.name}</p> : null}
                  {s.bio ? <p className="mt-0.5 line-clamp-2 text-xs text-muted">{s.bio}</p> : null}
                  <p className="mt-1 text-xs text-muted">{s.cardCount} cards</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-center text-sm text-muted">
        <Link href="/" className="font-semibold text-accent-2">
          Back to The Binder
        </Link>
      </p>
    </main>
  );
}
