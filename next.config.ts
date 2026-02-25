import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-ical"],
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
