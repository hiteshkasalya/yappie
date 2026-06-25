import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://yappie-72iy.onrender.com";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/auth/google",
        destination: `${backendUrl}/api/auth/google`,
      },
      {
        source: "/api/auth/session",
        destination: `${backendUrl}/api/auth/session`,
      },
    ];
  },
};

export default nextConfig;
