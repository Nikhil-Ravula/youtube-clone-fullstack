import type { NextConfig } from "next";

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
    BACKEND_URL: process.env.BACKEND_URL || "http://localhost:5000",
  },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "http://localhost:5000/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://localhost:5000/uploads/:path*",
      },
      {
        source: "/socket.io",
        destination: "http://localhost:5000/socket.io/",
      },
      {
        source: "/socket.io/:path*",
        destination: "http://localhost:5000/socket.io/:path*",
      },
    ];
  },
};

export default nextConfig;
