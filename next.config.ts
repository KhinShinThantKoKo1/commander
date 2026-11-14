import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.DEPLOY_TARGET === "docker" ? { output: "standalone" as const } : {}),
  poweredByHeader: false,
  reactStrictMode: true
};

export default nextConfig;
