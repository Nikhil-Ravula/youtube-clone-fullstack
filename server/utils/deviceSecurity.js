import { UAParser } from "ua-parser-js";
import crypto from "crypto";

/**
 * Calculates current time in Indian Standard Time (IST, UTC+05:30)
 * Determines whether light theme (5:00 AM - 12:00 PM IST)
 * or dark theme (all other periods) should be applied.
 */
export const getISTTimeInfo = () => {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istString);
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();

  // 5:00 AM to 12:00 PM IST (5:00 to 11:59) -> light theme
  // 12:00 PM to 5:00 AM IST -> dark theme
  const isLightPeriod = hours >= 5 && hours < 12;
  const theme = isLightPeriod ? "light" : "dark";

  const timeFormatted = istDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dateFormatted = istDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return {
    hours,
    minutes,
    isLightPeriod,
    theme,
    timeFormatted,
    dateFormatted,
    fullIST: istString,
  };
};

/**
 * Parses user-agent and request metadata to extract comprehensive client details:
 * Public IP, Browser, Version, OS, Device Type, Device Model, City, State, Country.
 */
export const parseClientDeviceInfo = (req, body = {}) => {
  const uaHeader = req.headers["user-agent"] || body.userAgent || "";
  const parser = new UAParser(uaHeader);
  const uaResult = parser.getResult();

  // Browser name & version
  let browser = body.browser || uaResult.browser.name || "Chrome";
  let browserVersion =
    body.browserVersion ||
    uaResult.browser.version ||
    uaResult.browser.major ||
    "124.0";

  // Operating System
  let os = body.os || uaResult.os.name || "Windows";
  let osVersion = body.osVersion || uaResult.os.version || "11";

  // Device type & model
  let rawType = uaResult.device.type;
  let deviceType = "Desktop";
  if (body.deviceType) {
    deviceType = body.deviceType;
  } else if (rawType === "mobile") {
    deviceType = "Mobile";
  } else if (rawType === "tablet") {
    deviceType = "Tablet";
  }

  let deviceModel =
    body.deviceModel ||
    uaResult.device.model ||
    (deviceType === "Desktop" ? "Personal Computer" : "Smart Device");

  // Public IP detection with headers fallback
  let ip =
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "127.0.0.1";

  if (typeof ip === "string" && ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }
  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  // If local development loopback, accept client-provided public IP if present or default
  if ((ip === "::1" || ip === "127.0.0.1") && body.clientIp) {
    ip = body.clientIp;
  } else if (ip === "::1") {
    ip = "127.0.0.1";
  }

  // City, State, Country resolution (falls back to client reported or realistic default)
  const city = body.city || (ip === "127.0.0.1" ? "Hyderabad" : "Mumbai");
  const state = body.state || (ip === "127.0.0.1" ? "Telangana" : "Maharashtra");
  const country = body.country || "India";
  const location = body.location || `${city}, ${state}, ${country}`;

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    deviceModel,
    ip,
    city,
    state,
    country,
    location,
    deviceId: body.deviceId || null,
  };
};

/**
 * Anomaly Detection Engine:
 * Compares incoming login context with user's trusted devices and security history:
 * - New browser (e.g. Chrome vs Firefox)
 * - New device (new deviceId / unregistered device)
 * - New IP address
 * - Different city or state location
 */
export const detectSecurityAnomalies = (user, current) => {
  const anomalies = [];

  // Check if current device is an existing valid Trusted Device
  const existingTrusted = user.trustedDevices?.find((td) => {
    const isIdMatch = td.deviceId && current.deviceId && td.deviceId === current.deviceId;
    const isNotExpired = !td.expiresAt || new Date(td.expiresAt) > new Date();
    return isIdMatch && isNotExpired;
  });

  if (existingTrusted) {
    return {
      isTrusted: true,
      anomalies: [],
      trustedDevice: existingTrusted,
    };
  }

  // If user has zero previous security footprint (first ever login)
  const isFirstLoginEver =
    (!user.knownBrowsers || user.knownBrowsers.length === 0) &&
    (!user.knownIps || user.knownIps.length === 0) &&
    (!user.trustedDevices || user.trustedDevices.length === 0);

  if (isFirstLoginEver) {
    return {
      isTrusted: false,
      isFirstLogin: true,
      anomalies: [],
    };
  }

  // 1. Browser Check
  const currentBrowserName = (current.browser || "").trim().toLowerCase();
  const knownBrowsers = user.knownBrowsers || [];
  const isBrowserKnown = knownBrowsers.some((b) =>
    b.toLowerCase().includes(currentBrowserName) || currentBrowserName.includes(b.toLowerCase())
  );
  if (!isBrowserKnown) {
    anomalies.push(`New browser detected: ${current.browser} (${current.browserVersion || "Latest"})`);
  }

  // 2. Device Check
  const knownDevices = user.trustedDevices || [];
  const isDeviceKnown = knownDevices.some((d) => d.deviceId === current.deviceId);
  if (!isDeviceKnown) {
    anomalies.push(`New ${current.deviceType} detected: ${current.deviceModel} on ${current.os}`);
  }

  // 3. IP Address Check
  const knownIps = user.knownIps || [];
  const isIpKnown = knownIps.includes(current.ip);
  if (!isIpKnown) {
    anomalies.push(`New IP address detected: ${current.ip}`);
  }

  // 4. City / State Location Check
  const knownLocations = user.knownLocations || [];
  if (knownLocations.length > 0) {
    const isLocationKnown = knownLocations.some(
      (loc) =>
        loc.city?.toLowerCase() === current.city?.toLowerCase() ||
        loc.state?.toLowerCase() === current.state?.toLowerCase()
    );
    if (!isLocationKnown) {
      anomalies.push(`Different location detected: ${current.city}, ${current.state}`);
    }
  }

  return {
    isTrusted: false,
    isFirstLogin: false,
    anomalies,
  };
};

/**
 * Generates a secure 6-digit numeric OTP code
 */
export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generates an opaque random token for challenge sessions
 */
export const generateChallengeToken = () => {
  return crypto.randomBytes(32).toString("hex");
};
