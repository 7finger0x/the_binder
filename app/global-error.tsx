"use client";

import { AppErrorComponent } from "@/lib/error-component";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="en">
      <body>
        <AppErrorComponent error={error} />
      </body>
    </html>
  );
}
