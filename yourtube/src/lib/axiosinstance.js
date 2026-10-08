import axios from "axios";

const getBaseURL = () => {
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    // On ngrok, LAN, or remote domains, use the Next.js reverse proxy (/api/proxy)
    // so mobile browsers don't fail trying to reach http://localhost:5000 directly.
    if (!isLocalhost) {
      return "/api/proxy";
    }
  }
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:5000"
  );
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
});

// Dynamic interceptor to ensure correct proxy URL on remote/ngrok clients
axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!isLocalhost) {
      config.baseURL = "/api/proxy";
    }
  }
  return config;
});

export default axiosInstance;
