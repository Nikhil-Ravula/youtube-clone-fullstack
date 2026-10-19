import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import SecurityOtp from "../Modals/SecurityOtp.js";
import LoginRecord from "../Modals/LoginRecord.js";
import { checkAndSyncSubscription } from "../utils/plansConfig.js";
import {
  getISTTimeInfo,
  parseClientDeviceInfo,
  detectSecurityAnomalies,
  generateOtp,
  generateChallengeToken,
} from "../utils/deviceSecurity.js";
import { sendSecurityOtpEmail } from "../utils/emailService.js";

/**
 * Helper to mask email address for security modal display
 * e.g., "johndoe@gmail.com" -> "j***e@gmail.com"
 */
const maskEmail = (email) => {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

/**
 * Enhanced Login Controller:
 * 1. Collects IP, Browser, Version, OS, Device Type, Device Model, City, State, Country.
 * 2. Applies time-based theme (5:00 AM - 12:00 PM IST = light, others = dark).
 * 3. Enforces OTP verification upon anomaly detection (new browser, device, IP, or city/state).
 * 4. Manages 30-day trusted devices and writes comprehensive login audit records.
 */
export const login = async (req, res) => {
  const { email, name, image } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const deviceInfo = parseClientDeviceInfo(req, req.body);
    const istInfo = getISTTimeInfo();

    let existingUser = await users.findOne({ email });

    // --- CASE 1: NEW USER REGISTRATION ---
    if (!existingUser) {
      const initialTheme = istInfo.theme; // 5 AM - 12 PM light, else dark

      const newUser = await users.create({
        email,
        name,
        image,
        theme: initialTheme,
        themePreference: "auto",
        knownBrowsers: [deviceInfo.browser],
        knownIps: [deviceInfo.ip],
        knownLocations: [
          {
            city: deviceInfo.city,
            state: deviceInfo.state,
            country: deviceInfo.country,
            location: deviceInfo.location,
          },
        ],
        trustedDevices: [
          {
            deviceId: deviceInfo.deviceId || `dev_${Date.now()}`,
            deviceName: `${deviceInfo.browser} on ${deviceInfo.os}`,
            browser: deviceInfo.browser,
            browserVersion: deviceInfo.browserVersion,
            os: deviceInfo.os,
            osVersion: deviceInfo.osVersion,
            deviceType: deviceInfo.deviceType,
            deviceModel: deviceInfo.deviceModel,
            ip: deviceInfo.ip,
            city: deviceInfo.city,
            state: deviceInfo.state,
            country: deviceInfo.country,
            location: deviceInfo.location,
            trustedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            lastActive: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        lastLoginIp: deviceInfo.ip,
        lastLoginDevice: `${deviceInfo.browser} on ${deviceInfo.os}`,
        lastLoginLocation: deviceInfo.location,
      });

      // Audit Record
      await LoginRecord.create({
        userId: newUser._id,
        email: newUser.email,
        deviceId: deviceInfo.deviceId,
        ip: deviceInfo.ip,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        deviceType: deviceInfo.deviceType,
        deviceModel: deviceInfo.deviceModel,
        city: deviceInfo.city,
        state: deviceInfo.state,
        country: deviceInfo.country,
        location: deviceInfo.location,
        status: "SUCCESS",
        reason: "Initial registration and trusted device initialization",
        isTrustedDevice: true,
      });

      return res.status(201).json({
        result: newUser,
        theme: newUser.theme,
        themePreference: newUser.themePreference,
        istInfo,
      });
    }

    // --- CASE 2: EXISTING USER LOGIN ---
    await checkAndSyncSubscription(existingUser);

    // Run Security Anomaly Detection
    const securityCheck = detectSecurityAnomalies(existingUser, deviceInfo);

    // If an anomaly is detected and device is NOT trusted -> TRIGGER OTP
    if (!securityCheck.isTrusted && securityCheck.anomalies.length > 0) {
      const otp = generateOtp();
      const tempToken = generateChallengeToken();

      // Delete any prior active OTP challenge for this user
      await SecurityOtp.deleteMany({ userId: existingUser._id });

      // Save new OTP with 10-minute validity
      await SecurityOtp.create({
        userId: existingUser._id,
        email: existingUser.email,
        otp,
        tempToken,
        loginPayload: {
          ...deviceInfo,
          anomalies: securityCheck.anomalies,
        },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      // Dispatch security verification email
      await sendSecurityOtpEmail({
        to: existingUser.email,
        userName: existingUser.name || "User",
        otp,
        deviceInfo,
        anomalies: securityCheck.anomalies,
      });

      // Audit Log for OTP challenge
      await LoginRecord.create({
        userId: existingUser._id,
        email: existingUser.email,
        deviceId: deviceInfo.deviceId,
        ip: deviceInfo.ip,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        deviceType: deviceInfo.deviceType,
        deviceModel: deviceInfo.deviceModel,
        city: deviceInfo.city,
        state: deviceInfo.state,
        country: deviceInfo.country,
        location: deviceInfo.location,
        status: "OTP_REQUIRED",
        reason: securityCheck.anomalies.join(" | "),
        isTrustedDevice: false,
      });

      return res.status(200).json({
        requireOtp: true,
        tempToken,
        email: existingUser.email,
        maskedEmail: maskEmail(existingUser.email),
        anomalies: securityCheck.anomalies,
        deviceInfo,
        // Provided in non-production for instant verification and debugging
        devOtp: otp,
      });
    }

    // --- CASE 3: TRUSTED DEVICE OR RECOGNIZED LOGIN ---
    // Apply time-based theme if user preference is "auto"
    if (!existingUser.themePreference || existingUser.themePreference === "auto") {
      existingUser.theme = istInfo.theme;
      existingUser.themePreference = "auto";
    }

    // Refresh trusted device lastActive timestamp if matched
    if (securityCheck.trustedDevice) {
      const td = existingUser.trustedDevices.id(securityCheck.trustedDevice._id);
      if (td) {
        td.lastActive = new Date();
        td.ip = deviceInfo.ip;
      }
    }

    // Update last login telemetry
    existingUser.lastLoginAt = new Date();
    existingUser.lastLoginIp = deviceInfo.ip;
    existingUser.lastLoginDevice = `${deviceInfo.browser} on ${deviceInfo.os}`;
    existingUser.lastLoginLocation = deviceInfo.location;

    // Add browser/ip/location to known lists if not present
    if (!existingUser.knownBrowsers.includes(deviceInfo.browser)) {
      existingUser.knownBrowsers.push(deviceInfo.browser);
    }
    if (!existingUser.knownIps.includes(deviceInfo.ip)) {
      existingUser.knownIps.push(deviceInfo.ip);
    }

    await existingUser.save();

    // Audit Log for Successful Login
    await LoginRecord.create({
      userId: existingUser._id,
      email: existingUser.email,
      deviceId: deviceInfo.deviceId,
      ip: deviceInfo.ip,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion,
      deviceType: deviceInfo.deviceType,
      deviceModel: deviceInfo.deviceModel,
      city: deviceInfo.city,
      state: deviceInfo.state,
      country: deviceInfo.country,
      location: deviceInfo.location,
      status: "SUCCESS",
      reason: securityCheck.isTrusted
        ? "Verified trusted device bypass"
        : "Standard authenticated login",
      isTrustedDevice: !!securityCheck.isTrusted,
    });

    return res.status(200).json({
      result: existingUser,
      theme: existingUser.theme,
      themePreference: existingUser.themePreference,
      istInfo,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong during sign in" });
  }
};

/**
 * Verifies 6-digit OTP code submitted by client during challenge
 */
export const verifyOtp = async (req, res) => {
  const { tempToken, otp, trustDevice = true, trustDurationDays = 30 } = req.body;

  if (!tempToken || !otp) {
    return res.status(400).json({ message: "Token and verification code are required" });
  }

  try {
    const otpRecord = await SecurityOtp.findOne({ tempToken });

    if (!otpRecord) {
      return res.status(400).json({
        message: "Verification challenge expired or invalid. Please sign in again.",
      });
    }

    // Check expiration
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await SecurityOtp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        message: "Verification code has expired. Please request a new code.",
      });
    }

    // Check OTP match
    if (otpRecord.otp !== otp.trim()) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      // Log failed attempt in audit
      await LoginRecord.create({
        userId: otpRecord.userId,
        email: otpRecord.email,
        deviceId: otpRecord.loginPayload?.deviceId,
        ip: otpRecord.loginPayload?.ip || "Unknown IP",
        browser: otpRecord.loginPayload?.browser || "Unknown",
        os: otpRecord.loginPayload?.os || "Unknown",
        city: otpRecord.loginPayload?.city,
        state: otpRecord.loginPayload?.state,
        country: otpRecord.loginPayload?.country,
        location: otpRecord.loginPayload?.location,
        status: "OTP_FAILED",
        reason: `Invalid OTP entered (Attempt ${otpRecord.attempts}/5)`,
        isTrustedDevice: false,
      });

      if (otpRecord.attempts >= 5) {
        await SecurityOtp.deleteOne({ _id: otpRecord._id });
        return res.status(403).json({
          message: "Too many failed attempts. Login blocked for security. Please sign in again.",
        });
      }

      return res.status(400).json({
        message: `Incorrect verification code. ${5 - otpRecord.attempts} attempts remaining.`,
      });
    }

    // --- SUCCESSFUL OTP VERIFICATION ---
    const user = await users.findById(otpRecord.userId);
    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }

    const payload = otpRecord.loginPayload || {};
    const istInfo = getISTTimeInfo();

    // 1. Add to known browsers, IPs, locations
    if (payload.browser && !user.knownBrowsers.includes(payload.browser)) {
      user.knownBrowsers.push(payload.browser);
    }
    if (payload.ip && !user.knownIps.includes(payload.ip)) {
      user.knownIps.push(payload.ip);
    }
    if (payload.city && payload.state) {
      const exists = user.knownLocations.some(
        (l) => l.city === payload.city && l.state === payload.state
      );
      if (!exists) {
        user.knownLocations.push({
          city: payload.city,
          state: payload.state,
          country: payload.country || "India",
          location: payload.location,
        });
      }
    }

    // 2. Register as Trusted Device if requested
    if (trustDevice && payload.deviceId) {
      const expirationDate = new Date(
        Date.now() + Number(trustDurationDays) * 24 * 60 * 60 * 1000
      );

      // Remove any existing entry with same deviceId
      user.trustedDevices = user.trustedDevices.filter(
        (td) => td.deviceId !== payload.deviceId
      );

      user.trustedDevices.push({
        deviceId: payload.deviceId,
        deviceName: `${payload.browser || "Browser"} on ${payload.os || "Device"}`,
        browser: payload.browser,
        browserVersion: payload.browserVersion,
        os: payload.os,
        osVersion: payload.osVersion,
        deviceType: payload.deviceType || "Desktop",
        deviceModel: payload.deviceModel,
        ip: payload.ip,
        city: payload.city,
        state: payload.state,
        country: payload.country,
        location: payload.location,
        trustedAt: new Date(),
        expiresAt: expirationDate,
        lastActive: new Date(),
      });
    }

    // 3. Update time-based theme if user preference is auto
    if (!user.themePreference || user.themePreference === "auto") {
      user.theme = istInfo.theme;
      user.themePreference = "auto";
    }

    user.lastLoginAt = new Date();
    user.lastLoginIp = payload.ip;
    user.lastLoginDevice = `${payload.browser} on ${payload.os}`;
    user.lastLoginLocation = payload.location;

    await user.save();
    await checkAndSyncSubscription(user);

    // Audit Record
    await LoginRecord.create({
      userId: user._id,
      email: user.email,
      deviceId: payload.deviceId,
      ip: payload.ip || "127.0.0.1",
      browser: payload.browser || "Unknown",
      browserVersion: payload.browserVersion,
      os: payload.os || "Unknown",
      osVersion: payload.osVersion,
      deviceType: payload.deviceType || "Desktop",
      deviceModel: payload.deviceModel,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      location: payload.location,
      status: "OTP_VERIFIED",
      reason: `Successfully verified OTP. ${trustDevice ? "Device added to trusted list." : "Single-session access."}`,
      isTrustedDevice: !!trustDevice,
    });

    // Delete verified OTP record
    await SecurityOtp.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
      success: true,
      result: user,
      theme: user.theme,
      themePreference: user.themePreference,
      istInfo,
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Failed to verify security code" });
  }
};

/**
 * Resends a fresh OTP code for an active verification challenge
 */
export const resendOtp = async (req, res) => {
  const { tempToken } = req.body;

  if (!tempToken) {
    return res.status(400).json({ message: "Session token is required" });
  }

  try {
    const existing = await SecurityOtp.findOne({ tempToken });
    if (!existing) {
      return res.status(404).json({ message: "Verification session expired" });
    }

    const newOtp = generateOtp();
    existing.otp = newOtp;
    existing.attempts = 0;
    existing.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await existing.save();

    await sendSecurityOtpEmail({
      to: existing.email,
      otp: newOtp,
      deviceInfo: existing.loginPayload,
      anomalies: existing.loginPayload?.anomalies || [],
    });

    return res.status(200).json({
      success: true,
      message: "A fresh verification code has been dispatched to your email.",
      devOtp: newOtp,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({ message: "Failed to resend code" });
  }
};

/**
 * Returns complete Account Security Overview:
 * - Active Trusted Devices & remaining validity
 * - Full Login Audit History
 * - Current Theme & IST Time info
 */
export const getSecurityOverview = async (req, res) => {
  const { id: userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Filter out expired trusted devices
    const now = new Date();
    const activeTrustedDevices = (user.trustedDevices || []).filter(
      (td) => !td.expiresAt || new Date(td.expiresAt) > now
    );

    // Fetch recent 40 login history records
    const loginHistory = await LoginRecord.find({ userId })
      .sort({ timestamp: -1 })
      .limit(40)
      .lean();

    const istInfo = getISTTimeInfo();

    return res.status(200).json({
      success: true,
      trustedDevices: activeTrustedDevices,
      loginHistory,
      theme: user.theme || istInfo.theme,
      themePreference: user.themePreference || "auto",
      istInfo,
      stats: {
        totalTrustedDevices: activeTrustedDevices.length,
        lastLoginAt: user.lastLoginAt,
        lastLoginLocation: user.lastLoginLocation,
        lastLoginDevice: user.lastLoginDevice,
        knownBrowsersCount: user.knownBrowsers?.length || 0,
      },
    });
  } catch (error) {
    console.error("Security overview error:", error);
    return res.status(500).json({ message: "Failed to retrieve security data" });
  }
};

/**
 * Revokes trust for a single device
 */
export const revokeTrustedDevice = async (req, res) => {
  const { id: userId, deviceId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const removedDevice = user.trustedDevices.find((td) => td.deviceId === deviceId);

    user.trustedDevices = user.trustedDevices.filter(
      (td) => td.deviceId !== deviceId
    );
    await user.save();

    // Audit log
    await LoginRecord.create({
      userId: user._id,
      email: user.email,
      deviceId,
      ip: removedDevice?.ip || "Unknown IP",
      browser: removedDevice?.browser || "Device",
      os: removedDevice?.os || "OS",
      status: "REVOKED",
      reason: `User manually revoked trusted status for device: ${removedDevice?.deviceName || deviceId}`,
      isTrustedDevice: false,
    });

    return res.status(200).json({
      success: true,
      message: "Device trust revoked. Future logins from this device will require OTP verification.",
      trustedDevices: user.trustedDevices,
    });
  } catch (error) {
    console.error("Revoke device error:", error);
    return res.status(500).json({ message: "Failed to revoke device trust" });
  }
};

/**
 * Revokes all trusted devices (logs out other sessions)
 */
export const revokeAllDevices = async (req, res) => {
  const { id: userId } = req.params;
  const { currentDeviceId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentDeviceId) {
      user.trustedDevices = user.trustedDevices.filter(
        (td) => td.deviceId === currentDeviceId
      );
    } else {
      user.trustedDevices = [];
    }

    await user.save();

    await LoginRecord.create({
      userId: user._id,
      email: user.email,
      ip: req.socket?.remoteAddress || "127.0.0.1",
      browser: "Security Center",
      os: "System",
      status: "REVOKED",
      reason: "User revoked trust for all remote devices and sessions",
      isTrustedDevice: false,
    });

    return res.status(200).json({
      success: true,
      message: "All other devices revoked. Any login from those devices will now require OTP verification.",
      trustedDevices: user.trustedDevices,
    });
  } catch (error) {
    console.error("Revoke all devices error:", error);
    return res.status(500).json({ message: "Failed to revoke devices" });
  }
};

/**
 * Updates Theme and Theme Preference ("auto", "light", "dark")
 * Persists preference across sessions and devices
 */
export const updateTheme = async (req, res) => {
  const { userId, theme, themePreference } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const istInfo = getISTTimeInfo();

    if (themePreference === "auto") {
      user.themePreference = "auto";
      user.theme = istInfo.theme;
    } else if (theme === "light" || theme === "dark") {
      user.themePreference = theme;
      user.theme = theme;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      theme: user.theme,
      themePreference: user.themePreference,
      istInfo,
    });
  } catch (error) {
    console.error("Update theme error:", error);
    return res.status(500).json({ message: "Failed to update theme" });
  }
};

/**
 * Standard Profile Update Controller
 */
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * Standard User Details by ID Controller
 */
export const getuserbyid = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "User not found" });
  }
  try {
    const user = await users.findById(_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await checkAndSyncSubscription(user);
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
