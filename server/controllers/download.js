import fs from "fs";
import path from "path";
import crypto from "crypto";
import Download from "../Modals/Download.js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";
import { checkAndSyncSubscription } from "../utils/plansConfig.js";

// Subscription Plans and Daily Download Limits
export const PLAN_CONFIG = {
  Free: {
    name: "Free",
    dailyLimit: 1,
    price: 0,
    badgeColor: "bg-gray-100 text-gray-800 border-gray-300",
    description: "1 download per day. Basic video access.",
  },
  Bronze: {
    name: "Bronze",
    dailyLimit: 5,
    price: 4.99,
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    description: "5 downloads per day. Faster queue.",
  },
  Silver: {
    name: "Silver",
    dailyLimit: 15,
    price: 9.99,
    badgeColor: "bg-slate-200 text-slate-800 border-slate-400",
    description: "15 downloads per day. HD priority downloads.",
  },
  Gold: {
    name: "Gold",
    dailyLimit: 50,
    price: 19.99,
    badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-400",
    description: "50 downloads per day (Unlimited capacity) & all features.",
  },
};

// In-memory token store for download authorizations (expires in 10 minutes)
const activeDownloadTokens = new Map();

// Helper: parse User-Agent
const parseUserAgent = (uaString = "") => {
  const ua = uaString.toLowerCase();
  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  // Device detection
  if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/.test(ua)) {
    device = "Mobile";
  } else if (/ipad|tablet|android(?!.*mobile)/.test(ua)) {
    device = "Tablet";
  } else {
    device = "Desktop";
  }

  // OS detection
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) os = "iOS";
  else if (ua.includes("linux")) os = "Linux";

  // Browser detection
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") && !ua.includes("edg/")) browser = "Chrome";
  else if (ua.includes("safari/") && !ua.includes("chrome/")) browser = "Safari";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("opr/") || ua.includes("opera/")) browser = "Opera";

  return { browser, os, device };
};

// Helper: Format bytes to human readable format
export const formatBytes = (bytes = 0) => {
  if (!bytes || bytes === 0) return "0 MB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Helper: calculate start and end of current UTC day
export const getUtcDayBounds = () => {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const secondsToReset = Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
  return { startOfDay, endOfDay, secondsToReset };
};

// Helper: evaluate effective plan taking expiration into account
export const getEffectivePlan = (user) => {
  if (!user) return "Free";
  const rawPlan = user.subscriptionPlan || "Free";
  if (rawPlan === "Free") return "Free";

  // If subscriber plan has an expiration date and it has passed, downgrade to Free
  if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
    return "Free";
  }
  return rawPlan;
};

/**
 * 1. GET /download/quota/:userId
 * Returns the user's active plan, download quota used today, remaining quota,
 * and seconds until the daily reset at 00:00 UTC.
 */
export const getUserQuota = async (req, res) => {
  const { userId } = req.params;
  try {
    const userDoc = await users.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    await checkAndSyncSubscription(userDoc);
    const plan = getEffectivePlan(userDoc);
    const planInfo = PLAN_CONFIG[plan] || PLAN_CONFIG.Free;
    const dailyLimit = planInfo.dailyLimit;
    const { startOfDay, secondsToReset } = getUtcDayBounds();

    // Count today's completed downloads that deducted quota
    const usedToday = await Download.countDocuments({
      userId,
      status: "completed",
      deductedQuota: true,
      downloadTimestamp: { $gte: startOfDay },
    });

    const remainingToday = Math.max(0, dailyLimit - usedToday);

    return res.status(200).json({
      plan,
      planInfo,
      dailyLimit,
      usedToday,
      remainingToday,
      secondsToReset,
      isExpired: userDoc.subscriptionPlan !== "Free" && plan === "Free",
      planExpiresAt: userDoc.planExpiresAt,
    });
  } catch (error) {
    console.error("Error fetching quota:", error);
    return res.status(500).json({ message: "Failed to fetch download quota" });
  }
};

/**
 * 2. POST /download/authorize
 * Verifies if user can download the video.
 * Handles 24h grace period for same-video re-downloads without penalty.
 */
export const authorizeDownload = async (req, res) => {
  const { userId, videoId, deviceId } = req.body;

  if (!userId || !videoId) {
    return res.status(400).json({
      authorized: false,
      message: "User ID and Video ID are required",
    });
  }

  try {
    // 1. Verify user exists
    const userDoc = await users.findById(userId);
    if (!userDoc) {
      return res.status(404).json({
        authorized: false,
        message: "User account not found. Please sign in.",
      });
    }
    await checkAndSyncSubscription(userDoc);

    // 2. Verify video exists in database and on filesystem
    const videoDoc = await video.findById(videoId);
    if (!videoDoc) {
      return res.status(404).json({
        authorized: false,
        message: "Video record not found.",
      });
    }

    const cleanFilePath = videoDoc.filepath.replace(/\\/g, "/");
    const absolutePath = path.resolve(cleanFilePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        authorized: false,
        message: "The requested video file is not accessible on the server storage.",
      });
    }

    const plan = getEffectivePlan(userDoc);
    const planInfo = PLAN_CONFIG[plan] || PLAN_CONFIG.Free;
    const dailyLimit = planInfo.dailyLimit;
    const { startOfDay, secondsToReset } = getUtcDayBounds();

    // 3. Check for 24-hour grace period on duplicate downloads of the SAME video
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingDownload = await Download.findOne({
      userId,
      videoId,
      status: "completed",
      downloadTimestamp: { $gte: twentyFourHoursAgo },
    }).sort({ downloadTimestamp: -1 });

    const isGracePeriod = !!existingDownload;

    // 4. Count today's completed downloads that deducted quota
    const usedToday = await Download.countDocuments({
      userId,
      status: "completed",
      deductedQuota: true,
      downloadTimestamp: { $gte: startOfDay },
    });

    const remainingToday = Math.max(0, dailyLimit - usedToday);

    // If quota exhausted AND this video is NOT within the free 24h re-download grace period
    if (remainingToday <= 0 && !isGracePeriod) {
      return res.status(403).json({
        authorized: false,
        reason: "QUOTA_EXCEEDED",
        message: `You have reached your daily limit of ${dailyLimit} download${
          dailyLimit === 1 ? "" : "s"
        } on the ${plan} plan. Upgrade your subscription for more downloads or wait until daily reset.`,
        plan,
        dailyLimit,
        usedToday,
        remainingToday: 0,
        secondsToReset,
        canUpgrade: plan !== "Gold",
      });
    }

    // 5. Register device if provided
    if (deviceId && userDoc.registeredDevices) {
      const existingDevice = userDoc.registeredDevices.find((d) => d.deviceId === deviceId);
      if (!existingDevice) {
        userDoc.registeredDevices.push({
          deviceId,
          deviceName: req.headers["user-agent"] ? parseUserAgent(req.headers["user-agent"]).device : "Registered Device",
          lastUsed: new Date(),
        });
        await userDoc.save();
      } else {
        existingDevice.lastUsed = new Date();
        await userDoc.save();
      }
    }

    // 6. Generate secure short-lived download token (valid 5 minutes)
    const token = crypto.randomBytes(32).toString("hex");
    activeDownloadTokens.set(token, {
      userId,
      videoId,
      plan,
      isGracePeriod,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Cleanup expired tokens periodically
    setTimeout(() => {
      activeDownloadTokens.delete(token);
    }, 6 * 60 * 1000);

    return res.status(200).json({
      authorized: true,
      downloadToken: token,
      plan,
      dailyLimit,
      usedToday,
      remainingToday: isGracePeriod ? remainingToday : Math.max(0, remainingToday - 1),
      isGracePeriod,
      secondsToReset,
      videoTitle: videoDoc.videotitle,
      fileSize: videoDoc.filesize,
      formattedSize: formatBytes(videoDoc.filesize),
    });
  } catch (error) {
    console.error("Download authorization error:", error);
    return res.status(500).json({
      authorized: false,
      message: "Server error validating download permissions.",
    });
  }
};

/**
 * 3. GET /download/file/:videoId
 * Streams the video file securely with attachment disposition.
 * Maintains complete audit trail (IP, Device, Browser, OS, Plan, Status).
 */
export const streamDownloadFile = async (req, res) => {
  const { videoId } = req.params;
  const { token, userId } = req.query;

  // 1. Verify download token
  if (!token || !activeDownloadTokens.has(token)) {
    return res.status(401).send("Invalid or expired download authorization token. Please initiate download again.");
  }

  const tokenData = activeDownloadTokens.get(token);
  if (tokenData.videoId !== videoId || (userId && tokenData.userId !== userId)) {
    return res.status(403).send("Download authorization token mismatch.");
  }

  // Token is single-use for starting stream
  activeDownloadTokens.delete(token);

  try {
    const videoDoc = await video.findById(videoId);
    if (!videoDoc) {
      return res.status(404).send("Video file not found in system.");
    }

    const cleanFilePath = videoDoc.filepath.replace(/\\/g, "/");
    const absolutePath = path.resolve(cleanFilePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).send("Video file not found on disk.");
    }

    const stat = fs.statSync(absolutePath);
    const fileSize = stat.size;
    const formattedSize = formatBytes(fileSize);

    // Extract device/client telemetry
    const uaString = req.headers["user-agent"] || "";
    const { browser, os, device } = parseUserAgent(uaString);
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "Unknown";

    // Deduct quota only if not within 24h grace period
    const deductedQuota = !tokenData.isGracePeriod;

    // 2. Pre-create download record with "in-progress" status for audit tracking
    const downloadRecord = new Download({
      userId: tokenData.userId,
      videoId,
      ipAddress,
      device,
      browser,
      os,
      userAgent: uaString.substring(0, 300),
      deviceId: req.query.deviceId || "web-browser",
      subscriptionPlan: tokenData.plan,
      fileSize,
      formattedSize,
      status: "in-progress",
      deductedQuota,
      downloadToken: token,
    });

    await downloadRecord.save();

    // 3. Set standard attachment download headers
    const safeFilename = encodeURIComponent(
      (videoDoc.videotitle || "video").replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "video"
    );

    res.writeHead(200, {
      "Content-Type": videoDoc.filetype || "video/mp4",
      "Content-Length": fileSize,
      "Content-Disposition": `attachment; filename="${safeFilename}.mp4"; filename*=UTF-8''${safeFilename}.mp4`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    // 4. Stream file from disk
    const readStream = fs.createReadStream(absolutePath);

    readStream.on("error", async (streamErr) => {
      console.error("Stream error during download:", streamErr);
      downloadRecord.status = "failed";
      downloadRecord.failureReason = streamErr.message;
      await downloadRecord.save();
      if (!res.headersSent) {
        res.status(500).send("Error streaming video file.");
      }
    });

    // Mark as completed once successfully piped to client
    res.on("finish", async () => {
      downloadRecord.status = "completed";
      await downloadRecord.save();
    });

    // If client cancels or disconnects prematurely
    req.on("close", async () => {
      if (!res.writableEnded) {
        downloadRecord.status = "failed";
        downloadRecord.failureReason = "Client connection closed before download finished.";
        await downloadRecord.save();
      }
    });

    readStream.pipe(res);
  } catch (error) {
    console.error("Failed to execute video download:", error);
    return res.status(500).send("Internal server error downloading video.");
  }
};

/**
 * 4. GET /download/user/:userId
 * Retrieves user's download history with full details for the dedicated Downloads page.
 */
export const getUserDownloads = async (req, res) => {
  const { userId } = req.params;

  try {
    const userDoc = await users.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }
    await checkAndSyncSubscription(userDoc);
    const plan = getEffectivePlan(userDoc);
    const planInfo = PLAN_CONFIG[plan] || PLAN_CONFIG.Free;
    const dailyLimit = planInfo.dailyLimit;
    const { startOfDay, secondsToReset } = getUtcDayBounds();

    // Downloads used today
    const usedToday = await Download.countDocuments({
      userId,
      status: "completed",
      deductedQuota: true,
      downloadTimestamp: { $gte: startOfDay },
    });

    const remainingToday = Math.max(0, dailyLimit - usedToday);

    // Retrieve user's downloads history (populated with video information)
    const downloadHistory = await Download.find({
      userId,
      isDeleted: false,
    })
      .populate("videoId", "videotitle filename filepath filesize videochanel uploader")
      .sort({ downloadTimestamp: -1 })
      .limit(100);

    return res.status(200).json({
      plan,
      planInfo,
      dailyLimit,
      usedToday,
      remainingToday,
      secondsToReset,
      planExpiresAt: userDoc.planExpiresAt,
      downloads: downloadHistory,
    });
  } catch (error) {
    console.error("Error retrieving user downloads:", error);
    return res.status(500).json({ message: "Failed to retrieve download records." });
  }
};

/**
 * 5. POST /download/plan/upgrade
 * Allows users to upgrade or switch their subscription plan.
 */
export const upgradeSubscriptionPlan = async (req, res) => {
  const { userId, plan, durationDays = 30 } = req.body;

  if (!userId || !plan || !PLAN_CONFIG[plan]) {
    return res.status(400).json({
      message: `Invalid plan. Must be one of: ${Object.keys(PLAN_CONFIG).join(", ")}`,
    });
  }

  try {
    const userDoc = await users.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    const expiresAt =
      plan === "Free"
        ? null
        : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    userDoc.subscriptionPlan = plan;
    userDoc.planExpiresAt = expiresAt;
    await userDoc.save();

    const planInfo = PLAN_CONFIG[plan];
    const { startOfDay, secondsToReset } = getUtcDayBounds();

    const usedToday = await Download.countDocuments({
      userId,
      status: "completed",
      deductedQuota: true,
      downloadTimestamp: { $gte: startOfDay },
    });

    const remainingToday = Math.max(0, planInfo.dailyLimit - usedToday);

    return res.status(200).json({
      message: `Successfully updated subscription to ${plan} Plan!`,
      user: userDoc,
      plan,
      dailyLimit: planInfo.dailyLimit,
      usedToday,
      remainingToday,
      planExpiresAt: expiresAt,
      secondsToReset,
    });
  } catch (error) {
    console.error("Error updating subscription plan:", error);
    return res.status(500).json({ message: "Failed to upgrade subscription plan." });
  }
};

/**
 * 6. DELETE /download/record/:id
 * Soft deletes a download record from the user's Downloads page while keeping the audit trail.
 */
export const deleteDownloadRecord = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  try {
    const record = await Download.findOne({ _id: id, userId });
    if (!record) {
      return res.status(404).json({ message: "Download record not found." });
    }

    record.isDeleted = true;
    await record.save();

    return res.status(200).json({ message: "Download record removed from history." });
  } catch (error) {
    console.error("Error deleting download record:", error);
    return res.status(500).json({ message: "Failed to remove download record." });
  }
};
