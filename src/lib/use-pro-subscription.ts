"use client";

import { useCallback, useEffect, useState } from "react";
import {
  activateProSubscription,
  isPro,
  proTrialDaysLeft,
  readProState,
  startProTrial,
  type ProState,
} from "@/lib/subscription";
import { getServerProStatus } from "@/lib/subscription-server";
import { getBearerToken } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function useProSubscription() {
  const { user } = useCurrentUserState();
  const [state, setState] = useState<ProState>(DEFAULT);
  const [serverPro, setServerPro] = useState(false);

  useEffect(() => {
    setState(readProState());
  }, []);

  useEffect(() => {
    if (!user) {
      setServerPro(false);
      return;
    }
    let cancelled = false;
    void getServerProStatus(getBearerToken() ?? undefined).then((status) => {
      if (cancelled) return;
      setServerPro(status.isPro);
      if (status.isPro && status.source === "stripe") {
        setState(activateProSubscription());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const refresh = useCallback(() => {
    setState(readProState());
    if (!user) return;
    void getServerProStatus(getBearerToken() ?? undefined).then((status) => {
      setServerPro(status.isPro);
      if (status.isPro && status.source === "stripe") setState(activateProSubscription());
    });
  }, [user]);

  const startTrial = useCallback(() => {
    setState(startProTrial());
  }, []);

  const subscribe = useCallback(() => {
    setState(activateProSubscription());
    setServerPro(true);
  }, []);

  const localPro = isPro(state);

  return {
    state,
    isPro: localPro || serverPro,
    trialDaysLeft: proTrialDaysLeft(state),
    startTrial,
    subscribe,
    refresh,
  };
}

const DEFAULT: ProState = { status: "free", trialEndsAt: null, subscribedAt: null };
