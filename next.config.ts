import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
