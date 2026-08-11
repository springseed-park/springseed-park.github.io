import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  async headers() {
    return [{
      source: "/:path*",
      headers: [{ key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }],
    }];
  },
};

export default nextConfig;
