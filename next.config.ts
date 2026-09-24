import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@prosera/i18n"],
  async redirects() {
    return [
      { source: "/prototype", destination: "/", permanent: false },
      { source: "/prototype/future-energy", destination: "/", permanent: false },
      { source: "/prototype/future-energy/:path*", destination: "/", permanent: false },
      { source: "/api/future-energy/:path*", destination: "/api/compass/:path*", permanent: false },
    ]
  },
};

export default nextConfig;
