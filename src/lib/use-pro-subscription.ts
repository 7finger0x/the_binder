"use client";

import { useCallback, useEffect, useState } from "react";
import { getServerProStatus, type ServerProStatus } from "@/lib/subscription-server";
import { getBearerToken } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const DEFAULT_STATUS: ServerProStatus = {
  isPro: false,
  status: "inactive",
  source: "none",
  currentPeriodEnd: null,
  trialDaysLeft: null,
};

export function useProSubscription() {
  const { user } = useCurrentUserState();
  const [status, setStatus] = useState<ServerProStatus>(DEFAULT_STATUS);

  const refresh = useCallback(() => {
    if (!user) {
      setStatus(DEFAULT_STATUS);
      return;
    }
    void getServerProStatus(getBearerToken() ?? undefined).then(setStatus);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isPro: status.isPro,
    trialDaysLeft: status.trialDaysLeft,
    refresh,
  };
}
