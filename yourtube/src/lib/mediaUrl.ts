/**
 * Helper to construct media asset URLs (videos, thumbnails, uploads)
 * Supports both local development (http://localhost:5000) and remote tunnels like ngrok
 * by routing through Next.js reverse-proxy rewrites (/uploads/...).
 */
export const getMediaUrl = (filepath?: string): string => {
  if (!filepath) return "";
  const cleanPath = filepath.replace(/\\/g, "/");
  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }

  const normalized = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;

  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    // On ngrok, LAN, or remote devices, use relative path so Next.js proxies it
    if (!isLocalhost) {
      return normalized;
    }
  }

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:5000";

  return `${backendUrl.replace(/\/+$/, "")}${normalized}`;
};
