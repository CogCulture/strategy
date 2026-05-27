import type { NextConfig } from "next";

// In Docker: use the service name. Locally: use localhost.
const INTERNAL_API_URL = process.env.NEXT_INTERNAL_API_URL || "http://backend:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${INTERNAL_API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
