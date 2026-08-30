import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";

type LoginSearch = { error?: string; error_description?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    error: typeof s.error === "string" ? s.error : undefined,
    error_description: typeof s.error_description === "string" ? s.error_description : undefined,
  }),
  component: Login,
});

function Login() {
  const search = Route.useSearch();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(search.error_description || search.error || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function oauth(providerId: string) {
    setBusy(providerId);
    setError("");
    try {
      await signIn(providerId, {
        callbackURL: "/",
        errorCallbackURL: "/login",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
      setBusy(null);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 8) {
      setError("Use an email and a password of at least 8 characters.");
      return;
    }
    setBusy("email");
    setError("");
    try {
      if (mode === "signup") {
        const { error: authError } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: email.trim().split("@")[0] || "Collector",
          callbackURL: "/",
        });
        if (authError) {
          setError(authError.message || "Couldn’t create that account.");
          setBusy(null);
          return;
        }
      } else {
        const { error: authError } = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: "/",
        });
        if (authError) {
          setError(authError.message || "That email sign-in didn’t work.");
          setBusy(null);
          return;
        }
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "That email sign-in didn’t work.");
      setBusy(null);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-ink">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-panel p-6">
        <h1 className="font-display text-2xl">The Card Binder</h1>
        <p className="text-sm leading-relaxed text-muted">
          Sign in to keep this collection on every device. You can still catalog on this device without an account.
        </p>

        {error ? (
          <p className="rounded-sm bg-raised px-3 py-2 text-sm text-danger">{humanAuthError(error)}</p>
        ) : null}

        {authEnabled ? (
          <div className="space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void oauth(p.providerId)}
                className="h-11 w-full rounded-md border border-line bg-raised px-4 text-sm font-semibold hover:border-accent disabled:opacity-50"
              >
                {busy === p.providerId ? "Redirecting…" : `Continue with ${p.label}`}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}

        {authEnabled && emailAndPasswordEnabled ? (
          <>
            <p className="text-center text-xs font-semibold tracking-wide text-muted uppercase">or email</p>
            <form className="space-y-3" onSubmit={submitEmail}>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-sm border border-line bg-pocket px-3 text-ink outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">Password</span>
                <input
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-sm border border-line bg-pocket px-3 text-ink outline-none focus:border-accent"
                />
              </label>
              <button
                type="submit"
                disabled={Boolean(busy)}
                className="h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-50"
              >
                {busy === "email" ? "Working…" : mode === "signup" ? "Create account" : "Sign in with email"}
              </button>
            </form>
            <button
              type="button"
              className="w-full text-center text-sm font-semibold text-accent-2"
              onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            >
              {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Create one"}
            </button>
          </>
        ) : null}

        <Link to="/" className="block text-center text-sm font-semibold text-accent-2">
          Back to binder
        </Link>
      </div>
    </main>
  );
}

function humanAuthError(raw: string) {
  const t = raw.toLowerCase();
  if (t.includes("invalid origin") || t.includes("invalid_origin") || t.includes("forbidden")) {
    return "Google/X didn’t accept this site’s address. After the latest deploy, try again — or use email below.";
  }
  if (t.includes("pglite") || t.includes("database") || t.includes("enont") || t.includes("connect")) {
    return "Accounts need a database on the live site. You can still catalog cards on this device without signing in, or use email after the host adds Postgres.";
  }
  if (t.includes("popup")) return "Allow pop-ups, then try Google or X again.";
  if (t.includes("redirect") || t.includes("redirect_uri") || t.includes("no redirect")) {
    return "Google/X came back to the wrong address. Email sign-in still works on this screen.";
  }
  if (t.includes("sign-in failed") || t === "failed") {
    return "Google/X didn’t finish. Try email below, or retry after the latest deploy.";
  }
  return raw;
}
