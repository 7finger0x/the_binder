"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { installPreviewHostBridge } from "@/lib/preview-host-bridge";

export function PreviewHostBridge() {
  const router = useRouter();

  useEffect(() => {
    return installPreviewHostBridge({
      navigate: (path) => {
        router.push(path);
      },
      getRoutePaths: () => ["/", "/login", "/c/:slug"],
    });
  }, [router]);

  return null;
}
