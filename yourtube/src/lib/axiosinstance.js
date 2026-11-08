import axios from "axios";

const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    // On ngrok, LAN, or remote domains without direct env, use reverse proxy
    if (!isLocalhost) {
      return "/api/proxy";
    }
  }
  return (
    process.env.BACKEND_URL ||
    "https://youtube-backend-rxbz.onrender.com"
  );
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
});

// Dynamic interceptor to ensure correct URL on clients
axiosInstance.interceptors.request.use((config) => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    config.baseURL = process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/+$/, "");
  } else if (typeof window !== "undefined") {
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
