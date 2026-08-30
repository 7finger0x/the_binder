import { createFileRoute } from "@tanstack/react-router";
import { auth, authHasDatabase } from "@/lib/auth/server";

const NEEDS_DB = /\/api\/auth\/(sign-in|sign-up|oauth2)/;

async function handleAuth(request: Request) {
  const path = new URL(request.url).pathname;
  if (NEEDS_DB.test(path) && !authHasDatabase && process.env.VERCEL) {
    return Response.json(
      {
        message:
          "Google/X and email need a Postgres database on this host. Add DATABASE_URL in the Vercel project (Neon), then redeploy. You can still catalog cards without signing in.",
      },
      { status: 503 },
    );
  }
  try {
    return await auth.handler(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign-in failed";
    return Response.json({ message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
});
