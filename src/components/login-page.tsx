"use client";

import Link from "next/link";
import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, getBearerToken, signIn } from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { setUsername } from "@/lib/social";
import { LogoLockup } from "@/components/logo";

export function LoginPage({
  error: initialError,
  reason,
}: {
  error?: string;
  reason?: "share";
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(initialError || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsernameInput] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function oauth(providerId: string) {
    setBusy(providerId);
    setError("");
    try {
      await signIn(providerId, {
        callbackURL: "/?setup=username",
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
    if (mode === "signup" && username.trim().length < 3) {
      setError("Pick a username (3–20 characters, letters, numbers, underscores).");
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
        const usernameResult = await setUsername(username, getBearerToken() ?? undefined);
        if (!usernameResult.ok) {
          setError(usernameResult.error);
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
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-panel p-5 sm:p-6">
        <LogoLockup className="justify-center" markClassName="size-14" showTagline titleAs="h1" />
        <p className="text-sm leading-relaxed text-muted">
          {reason === "share"
            ? "Sign in to share your catalog. Anyone with the link can view your owned cards — wishlist stays private."
            : "Sign in to keep this collection on every device. You can still catalog on this device without an account."}
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
              {mode === "signup" ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">Username</span>
                  <div className="flex h-11 items-center gap-1 rounded-sm border border-line bg-pocket px-3">
                    <span className="text-muted">@</span>
                    <input
                      value={username}
                      onChange={(e) => setUsernameInput(e.target.value.replace(/\s/g, ""))}
                      autoComplete="username"
                      placeholder="cardking42"
                      className="min-w-0 flex-1 bg-transparent text-ink outline-none focus:border-accent"
                    />
                  </div>
                </label>
              ) : null}
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

        <Link href="/" className="block text-center text-sm font-semibold text-accent-2">
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
  if (t.includes("503") || t.includes("postgres") || t.includes("database_url") || t.includes("no account database")) {
    return "This live site has no account database yet. Add Neon/Postgres as DATABASE_URL in Vercel, redeploy, then Google/X will work. You can still catalog cards without signing in.";
  }
  if (/^\s*500\b/.test(raw) || t.includes("500 —") || t.includes("internal server") || t.includes("pglite") || t.includes("enoent")) {
    return "The live site couldn’t open an account session. Add DATABASE_URL (Neon) in Vercel and redeploy, or catalog cards on this device without signing in.";
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
