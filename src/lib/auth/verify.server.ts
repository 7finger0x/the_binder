import { auth, authConfigured } from "./server";
import { gateIdentityEnabled } from "./gate-identity.server";

/**
 * Server-side session resolution (server-only).
 *
 * Because this app runs its OWN Better Auth at same-origin `/api/auth/*`, the
 * session cookie is sent with every request. Never trust a client-supplied user
 * id â€” only the result of this verification.
 */

/** True when a real database is configured server-side. */
const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());

/** Re-export so callers can branch on it without importing `server.ts`. */
export { authConfigured };

if (databaseConfigured && !authConfigured) {
  console.error(
    "[auth] DATABASE_URL is set but auth is disabled â€” requireUserId() will reject every request.",
  );
}

/** Dev fallback user id, used only when auth is disabled. */
export const DEV_USER_ID = "dev-user";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export type VerifiedUser = { id: string; email: string | null };

async function requestHeaders(bearerToken?: string): Promise<Headers> {
  const { headers } = await import("next/headers");
  const incoming = await headers();
  const reqHeaders = new Headers();
  incoming.forEach((value, key) => reqHeaders.set(key, value));
  if (bearerToken) reqHeaders.set("Authorization", `Bearer ${bearerToken}`);
  return reqHeaders;
}

export async function getSessionUser(bearerToken?: string): Promise<VerifiedUser | null> {
  if (!authConfigured && !gateIdentityEnabled()) return null;
  const session = await auth.api.getSession({ headers: await requestHeaders(bearerToken) });
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email ?? null };
}

export async function requireUserId(bearerToken?: string): Promise<string> {
  if (!authConfigured && !gateIdentityEnabled()) {
    if (databaseConfigured) {
      throw new Error(
        "Auth is disabled (NEXT_PUBLIC_AUTH_ENABLED=false) but DATABASE_URL is set â€” " +
          "refusing to fall back to the shared dev user against a real database.",
      );
    }
    return DEV_USER_ID;
  }
  const user = await getSessionUser(bearerToken);
  if (!user) throw new UnauthorizedError();
  return user.id;
}

