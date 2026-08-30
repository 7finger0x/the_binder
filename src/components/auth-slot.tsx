import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot({ className }: { className?: string }) {
  const { isPending } = useCurrentUserState();
  if (isPending) return <div className="size-11 animate-pulse rounded-md bg-raised" />;
  return (
    <div className={className}>
      <SignedOut>
        <Link
          to="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-md border border-line px-3 text-sm font-semibold md:w-auto"
        >
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </div>
  );
}
