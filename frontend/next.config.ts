import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api/photos/:path*", destination: `${backendOrigin}/api/photos/:path*` }];
  },
};

export default nextConfig;
