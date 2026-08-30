import { assertSameSiteRequest } from "./isolation.server";
import { requireUserId } from "./verify.server";

/** Resolve the verified user id for a server action (forwards optional preview bearer token). */
export async function requireUserIdForAction(bearerToken?: string): Promise<string> {
  await assertSameSiteRequest();
  return requireUserId(bearerToken);
}
