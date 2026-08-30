"use client";

import { AppErrorComponent } from "@/lib/error-component";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return <AppErrorComponent error={error} />;
}
