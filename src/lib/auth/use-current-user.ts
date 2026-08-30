"use client";

import { useEffect, useState } from "react";
import { authClient, authEnabled } from "./client";

/** Normalized user shape used across the app, auth on or off. */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  /** True when this is the sandbox/dev fallback (auth not configured). */
  isDevFallback: boolean;
};

/**
 * Stable fallback user, used ONLY when auth is disabled
 * (`VITE_AUTH_ENABLED=false`, the shipped default). With auth on, the sandbox
 * live preview does real sign-in via the baked preview client. Its id is
 * `"dev-user"` — the SAME id `verify.server.ts` returns server-side — so per-user
 * rows written in that mode belong to one consistent owner.
 */
export const DEV_USER: AppUser = {
  id: "dev-user",
  displayName: "Dev User",
  primaryEmail: "dev@example.com",
  profileImageUrl: null,
  isDevFallback: true,
};

/** `useCurrentUserState()` result: the user plus the session-loading flag. */
export type CurrentUserState = {
  /** The user — `null` BOTH while the session loads and when signed out. */
  user: AppUser | null;
  /** True while the session is still resolving — don't treat `user: null` as signed out yet. */
  isPending: boolean;
};

function sessionUserToAppUser(
  user: { id: string; name?: string | null; email?: string | null; image?: string | null } | null | undefined,
): AppUser | null {
  if (!user) return null;
  return {
    id: user.id,
    displayName: user.name ?? null,
    primaryEmail: user.email ?? null,
    profileImageUrl: user.image ?? null,
    isDevFallback: false,
  };
}

/**
 * Current user + loading state. Fetches the session on the client via
 * `authClient.getSession()` so SSR does not trip Better Auth's `useSession` hook.
 */
export function useCurrentUserState(): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>(() =>
    authEnabled ? { user: null, isPending: true } : { user: DEV_USER, isPending: false },
  );

  useEffect(() => {
    if (!authEnabled) return;
    let active = true;
    void authClient.getSession().then(({ data }) => {
      if (!active) return;
      setState({ user: sessionUserToAppUser(data?.user), isPending: false });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

/**
 * Convenience view of `useCurrentUserState().user` for display (e.g.
 * `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
 * for redirects/guards use `useCurrentUserState()` and check `isPending`.
 */
export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
