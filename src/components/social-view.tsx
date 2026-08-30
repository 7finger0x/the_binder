"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Search, UserPlus, Users, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getBearerToken } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  acceptFriendRequest,
  declineFriendRequest,
  getMyProfile,
  listDiscoverUsers,
  listFriends,
  listPendingRequests,
  removeFriend,
  sendFriendRequest,
  setUsername,
  type PublicUser,
} from "@/lib/social";

type SocialTab = "friends" | "discover";

export function SocialView({ onBack, onUsernameSet }: { onBack?: () => void; onUsernameSet?: () => void }) {
  const { user, isPending } = useCurrentUserState();
  const [tab, setTab] = useState<SocialTab>("discover");
  const [username, setUsernameInput] = useState("");
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [discover, setDiscover] = useState<PublicUser[]>([]);
  const [pending, setPending] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const token = getBearerToken() ?? undefined;

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfileLoading(false);
      setMyUsername(null);
      return;
    }
    setProfileLoading(true);
    try {
      const profile = await getMyProfile(token);
      setMyUsername(profile.username);
      if (profile.username) setUsernameInput(profile.username);
    } catch {
      setMyUsername(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user, token]);

  const refreshLists = useCallback(async () => {
    if (!user || !myUsername) return;
    setLoading(true);
    try {
      const [f, d, p] = await Promise.all([
        listFriends(token),
        listDiscoverUsers(query, token),
        listPendingRequests(token),
      ]);
      setFriends(f);
      setDiscover(d);
      setPending(p);
    } catch {
      ping("Couldn’t load collectors");
    } finally {
      setLoading(false);
    }
  }, [user, myUsername, query, token]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (!myUsername) return;
    const t = window.setTimeout(() => void refreshLists(), query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [myUsername, query, refreshLists]);

  function ping(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    setSavingUsername(true);
    setUsernameError("");
    try {
      const result = await setUsername(username, token);
      if (!result.ok) {
        setUsernameError(result.error);
        return;
      }
      setMyUsername(result.username);
      onUsernameSet?.();
      ping("Username saved");
    } catch {
      setUsernameError("Couldn’t save username. Try again.");
    } finally {
      setSavingUsername(false);
    }
  }

  async function friendAction(target: PublicUser, action: "add" | "accept" | "decline" | "remove") {
    setActionBusy(target.id);
    try {
      if (action === "add") {
        const result = await sendFriendRequest(target.id, token);
        if (!result.ok) {
          ping(result.error);
          return;
        }
        ping(result.status === "accepted" ? "You’re now friends!" : "Friend request sent");
      } else if (action === "accept") {
        const result = await acceptFriendRequest(target.id, token);
        if (!result.ok) {
          ping(result.error);
          return;
        }
        ping("Friend request accepted");
      } else if (action === "decline") {
        await declineFriendRequest(target.id, token);
        ping("Request declined");
      } else {
        await removeFriend(target.id, token);
        ping("Removed from friends");
      }
      await refreshLists();
    } catch {
      ping("Something went wrong");
    } finally {
      setActionBusy(null);
    }
  }

  if (isPending || profileLoading) {
    return (
      <div className="space-y-3">
        {onBack ? <BackHeader onBack={onBack} /> : null}
        <div className="h-24 animate-pulse rounded-lg bg-panel" />
        <div className="h-40 animate-pulse rounded-lg bg-panel" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        {onBack ? <BackHeader onBack={onBack} /> : null}
        <section className="rounded-lg border border-line bg-panel p-5 text-center">
          <Users className="mx-auto mb-3 size-10 text-collx-green" />
          <h2 className="font-display text-lg">Find other collectors</h2>
          <p className="mt-2 text-sm text-muted">Sign in to choose a username, add friends, and discover collectors.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex h-11 items-center rounded-md bg-accent px-5 text-sm font-semibold text-ink"
          >
            Sign in
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onBack ? <BackHeader onBack={onBack} /> : null}

      {toast ? (
        <p className="rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-ink">{toast}</p>
      ) : null}

      {!myUsername ? (
        <section className="rounded-lg border border-line bg-panel p-4">
          <h2 className="font-display text-lg">Choose a username</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Pick a unique handle so other collectors can find and friend you.
          </p>
          {usernameError ? (
            <p className="mb-3 rounded-sm bg-raised px-3 py-2 text-sm text-danger">{usernameError}</p>
          ) : null}
          <form className="space-y-3" onSubmit={saveUsername}>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">Username</span>
              <div className="flex items-center gap-1 rounded-sm border border-line bg-pocket px-3">
                <span className="text-muted">@</span>
                <input
                  value={username}
                  onChange={(e) => setUsernameInput(e.target.value.replace(/\s/g, ""))}
                  autoComplete="username"
                  placeholder="cardking42"
                  className="h-11 min-w-0 flex-1 bg-transparent outline-none"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={savingUsername || username.length < 3}
              className="h-11 w-full rounded-md bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-50"
            >
              {savingUsername ? "Saving…" : "Save username"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="rounded-lg border border-line bg-panel p-4">
            <p className="text-sm text-muted">Signed in as</p>
            <p className="font-display text-xl font-semibold">@{myUsername}</p>
          </section>

          {pending.length > 0 ? (
            <section className="rounded-lg border border-accent/40 bg-panel p-4">
              <h2 className="mb-3 font-display text-lg">Friend requests</h2>
              <ul className="space-y-2">
                {pending.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    busy={actionBusy === u.id}
                    onAccept={() => void friendAction(u, "accept")}
                    onDecline={() => void friendAction(u, "decline")}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex gap-2">
            <TabButton active={tab === "discover"} onClick={() => setTab("discover")} icon={Search} label="Discover" />
            <TabButton active={tab === "friends"} onClick={() => setTab("friends")} icon={UserCheck} label="Friends" count={friends.length} />
          </div>

          {tab === "discover" ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border border-line bg-panel px-3">
                <Search className="size-4 shrink-0 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by username…"
                  className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
                />
                {query ? (
                  <button type="button" aria-label="Clear" onClick={() => setQuery("")} className="text-muted">
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
              {loading ? (
                <p className="text-sm text-muted">Loading collectors…</p>
              ) : discover.length === 0 ? (
                <p className="rounded-lg border border-line bg-panel p-4 text-sm text-muted">
                  {query ? "No collectors match that search." : "No other collectors yet — invite friends to sign up!"}
                </p>
              ) : (
                <ul className="space-y-2">
                  {discover.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      busy={actionBusy === u.id}
                      onAdd={() => void friendAction(u, "add")}
                    />
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section>
              {loading ? (
                <p className="text-sm text-muted">Loading friends…</p>
              ) : friends.length === 0 ? (
                <p className="rounded-lg border border-line bg-panel p-4 text-sm text-muted">
                  No friends yet. Switch to Discover to find collectors.
                </p>
              ) : (
                <ul className="space-y-2">
                  {friends.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      busy={actionBusy === u.id}
                      onRemove={() => void friendAction(u, "remove")}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function BackHeader({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1 text-sm font-semibold text-accent-2"
    >
      <ChevronLeft className="size-4" />
      Back to profile
    </button>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md text-sm font-semibold",
        active ? "bg-collx-green text-white" : "border border-line bg-panel text-muted",
      )}
    >
      <Icon className="size-4" />
      {label}
      {count !== undefined && count > 0 ? (
        <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-white/20" : "bg-raised")}>{count}</span>
      ) : null}
    </button>
  );
}

function UserRow({
  user,
  busy,
  onAdd,
  onAccept,
  onDecline,
  onRemove,
}: {
  user: PublicUser;
  busy: boolean;
  onAdd?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onRemove?: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-panel p-3">
      <Avatar name={user.displayName ?? user.username} image={user.image} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">@{user.username}</p>
        {user.displayName && user.displayName !== user.username ? (
          <p className="truncate text-sm text-muted">{user.displayName}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        {onAdd ? (
          user.relation === "pending_outgoing" ? (
            <span className="text-xs font-semibold text-muted">Pending</span>
          ) : user.relation === "pending_incoming" ? (
            <>
              <ActionBtn label="Accept" onClick={onAccept!} busy={busy} primary />
              <ActionBtn label="Decline" onClick={onDecline!} busy={busy} />
            </>
          ) : (
            <ActionBtn label="Add" onClick={onAdd} busy={busy} primary icon={UserPlus} />
          )
        ) : null}
        {onAccept && !onAdd ? (
          <>
            <ActionBtn label="Accept" onClick={onAccept} busy={busy} primary />
            <ActionBtn label="Decline" onClick={onDecline!} busy={busy} />
          </>
        ) : null}
        {onRemove ? <ActionBtn label="Remove" onClick={onRemove} busy={busy} /> : null}
      </div>
    </li>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return <img src={image} alt="" className="size-10 rounded-full object-cover" />;
  }
  return (
    <span className="grid size-10 place-items-center rounded-full bg-collx-navy/10 text-sm font-bold text-collx-navy">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function ActionBtn({
  label,
  onClick,
  busy,
  primary,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  primary?: boolean;
  icon?: typeof UserPlus;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs font-semibold disabled:opacity-50",
        primary ? "bg-accent text-ink" : "border border-line bg-raised",
      )}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {label}
    </button>
  );
}
