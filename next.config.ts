import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-ical"],
  // 요청 헤더로 주소를 채우는 지침 응답이 공유 캐시에 남지 않게 한다.
  async headers() {
    return [
      { source: "/guide", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/guide.txt", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
