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

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "https://youtube-backend-rxbz.onrender.com";

  return `${backendUrl.replace(/\/+$/, "")}${normalized}`;
};
