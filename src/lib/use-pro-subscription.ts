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

export function useProSubscription() {
  const [state, setState] = useState<ProState>(DEFAULT);

  useEffect(() => {
    setState(readProState());
  }, []);

  const refresh = useCallback(() => {
    setState(readProState());
  }, []);

  const startTrial = useCallback(() => {
    setState(startProTrial());
  }, []);

  const subscribe = useCallback(() => {
    setState(activateProSubscription());
  }, []);

  return {
    state,
    isPro: isPro(state),
    trialDaysLeft: proTrialDaysLeft(state),
    startTrial,
    subscribe,
    refresh,
  };
}

const DEFAULT: ProState = { status: "free", trialEndsAt: null, subscribedAt: null };
