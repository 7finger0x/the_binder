"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot() {
  const { isPending } = useCurrentUserState();
  if (isPending) return <div className="size-11 animate-pulse rounded-md bg-raised" />;
  return (
    <>
      <SignedOut>
        <Link
          href="/login"
          className="inline-flex h-11 items-center rounded-md border border-line px-3 text-sm font-semibold"
        >
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </>
  );
}
