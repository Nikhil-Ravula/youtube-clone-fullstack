import type { NextConfig } from "next";

const rawBackendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "https://youtube-backend-rxbz.onrender.com";
const backendUrl = rawBackendUrl.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: [
    "mathew-destroyable-jeanette.ngrok-free.dev",
    "*.ngrok-free.dev",
    "*.ngrok.io",
    "*.ngrok-free.app",
  ],
  env: {
    BACKEND_URL: backendUrl,
    NEXT_PUBLIC_BACKEND_URL: backendUrl,
  },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${backendUrl}/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
      {
        source: "/socket.io",
        destination: `${backendUrl}/socket.io/`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
