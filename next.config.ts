import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{
      source: "/.well-known/:file*",
      headers: [
        { key: "Content-Type", value: "application/json" },
        { key: "Cache-Control", value: "public, max-age=3600" },
      ],
    }];
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
