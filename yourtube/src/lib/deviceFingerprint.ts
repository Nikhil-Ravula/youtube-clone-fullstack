/**
 * Utility to generate and persist a stable client device ID
 * and gather rich client-side browser/OS/device telemetry.
 */

export interface DeviceTelemetry {
  deviceId: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
  deviceModel: string;
  userAgent: string;
  clientTimezone: string;
  screenResolution: string;
}

export const getOrCreateDeviceId = (): string => {
  if (typeof window === "undefined") return "server_ssr";

  let id = localStorage.getItem("yourtube_device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
    localStorage.setItem("yourtube_device_id", id);
  }
  return id;
};

export const getDeviceTelemetry = (): DeviceTelemetry => {
  const deviceId = getOrCreateDeviceId();

  if (typeof window === "undefined") {
    return {
      deviceId,
      browser: "Chrome",
      browserVersion: "124.0",
      os: "Windows",
      osVersion: "11",
      deviceType: "Desktop",
      deviceModel: "Personal Computer",
      userAgent: "",
      clientTimezone: "Asia/Kolkata",
      screenResolution: "1920x1080",
    };
  }

  const ua = navigator.userAgent;
  let browser = "Chrome";
  let browserVersion = "124.0";
  let os = "Windows";
  let osVersion = "11";
  let deviceType: "Desktop" | "Mobile" | "Tablet" = "Desktop";
  let deviceModel = "Personal Computer";

  // Browser detection
  if (ua.includes("Firefox/")) {
    browser = "Firefox";
    browserVersion = ua.split("Firefox/")[1]?.split(" ")[0] || "125.0";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
    browserVersion = ua.split("Edg/")[1]?.split(" ")[0] || "124.0";
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome";
    browserVersion = ua.split("Chrome/")[1]?.split(" ")[0] || "124.0";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    browser = "Safari";
    browserVersion = ua.split("Version/")[1]?.split(" ")[0] || "17.4";
  }

  // OS detection
  if (ua.includes("Win")) {
    os = "Windows";
    osVersion = ua.includes("Windows NT 10.0") ? "10/11" : "Windows";
  } else if (ua.includes("Mac")) {
    os = "macOS";
    osVersion = "Sonoma";
  } else if (ua.includes("Android")) {
    os = "Android";
    osVersion = "14";
    deviceType = "Mobile";
    deviceModel = "Android Phone";
  } else if (ua.includes("iPhone")) {
    os = "iOS";
    osVersion = "17";
    deviceType = "Mobile";
    deviceModel = "Apple iPhone";
  } else if (ua.includes("iPad")) {
    os = "iPadOS";
    osVersion = "17";
    deviceType = "Tablet";
    deviceModel = "Apple iPad";
  } else if (ua.includes("Linux")) {
    os = "Linux";
    osVersion = "Ubuntu";
  }

  if (/Mobi|Android/i.test(ua) && deviceType === "Desktop") {
    deviceType = "Mobile";
    deviceModel = "Mobile Device";
  }

  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

  return {
    deviceId,
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    deviceModel,
    userAgent: ua,
    clientTimezone,
    screenResolution,
  };
};
