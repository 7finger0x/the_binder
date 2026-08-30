import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pg", "better-auth"],
  env: {
    NEXT_PUBLIC_AUTH_ENABLED:
      process.env.NEXT_PUBLIC_AUTH_ENABLED ?? process.env.VITE_AUTH_ENABLED ?? "true",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
