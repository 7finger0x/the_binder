import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-ink">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-panel p-6">
        <h1 className="font-display text-2xl">The Card Binder</h1>
        <p className="text-sm leading-relaxed text-muted">
          Sign in to keep this collection on every device. You can still catalog on this device without an account.
        </p>
        {authEnabled ? (
          GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              className="h-11 w-full rounded-md border border-line bg-raised px-4 text-sm font-semibold hover:border-accent"
            >
              Continue with {p.label}
            </button>
          ))
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        <a href="/" className="block text-center text-sm font-semibold text-accent-2">
          Back to binder
        </a>
      </div>
    </main>
  );
}
