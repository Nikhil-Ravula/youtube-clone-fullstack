import mongoose from "mongoose";
import dotenv from "dotenv";
import Download from "../Modals/Download.js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";

dotenv.config({ path: "../.env" });

const DBURL = process.env.DB_URL || "mongodb://127.0.0.1:27017/youtube_clone";

async function seed15DaysLogs() {
  try {
    console.log("Connecting to MongoDB:", DBURL);
    await mongoose.connect(DBURL);
    console.log("Connected successfully.");

    // Retrieve or create a sample user
    let user = await users.findOne();
    if (!user) {
      console.log("No user found. Creating sample user...");
      user = await users.create({
        email: "demo_student@yourtube.internal",
        name: "Demo Student",
        channelname: "TechLab Academy",
        subscriptionPlan: "Gold",
        subscriptionStatus: "active",
        planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    // Retrieve or create a sample video
    let sampleVideo = await video.findOne();
    if (!sampleVideo) {
      console.log("No video found. Creating sample video...");
      sampleVideo = await video.create({
        videotitle: "Advanced Web Architecture & Systems Design",
        filename: "video-sample-sysdesign.mp4",
        filetype: "video/mp4",
        filesize: 245000000,
        videochanel: "Engineering Insights",
        uploader: user.name || "Engineering Team",
      });
    }

    console.log(`Generating 15-day audit logs for User ID: ${user._id}, Video ID: ${sampleVideo._id}`);

    const now = new Date();
    const records = [];

    const deviceProfiles = [
      {
        device: "Desktop",
        browser: "Chrome",
        os: "Windows",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0",
        ip: "103.21.244.18",
        deviceId: "desktop-win-uuid-883",
      },
      {
        device: "Mobile",
        browser: "Safari",
        os: "iOS",
        ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
        ip: "49.37.112.90",
        deviceId: "iphone-16-pro-uuid-219",
      },
      {
        device: "Desktop",
        browser: "Firefox",
        os: "macOS",
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0",
        ip: "185.199.108.153",
        deviceId: "macbook-pro-m3-id44",
      },
      {
        device: "Tablet",
        browser: "Edge",
        os: "Android",
        ua: "Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 Chrome/128.0.0.0 EdgA/128.0.0.0",
        ip: "122.161.49.201",
        deviceId: "samsung-tab-s9-uuid-551",
      },
    ];

    const plans = ["Free", "Bronze", "Silver", "Gold"];

    // Generate simulated logs over the past 15 days
    for (let day = 15; day >= 1; day--) {
      const baseDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
      baseDate.setUTCHours(9, 30, 0, 0);

      const planForDay =
        day >= 12 ? "Free" : day >= 9 ? "Bronze" : day >= 5 ? "Silver" : "Gold";

      const dev = deviceProfiles[day % deviceProfiles.length];

      // Standard completed download for the day
      records.push({
        userId: user._id,
        videoId: sampleVideo._id,
        downloadTimestamp: new Date(baseDate.getTime() + 15 * 60 * 1000),
        ipAddress: dev.ip,
        device: dev.device,
        browser: dev.browser,
        os: dev.os,
        userAgent: dev.ua,
        deviceId: dev.deviceId,
        subscriptionPlan: planForDay,
        fileSize: 184500000 + day * 12000000,
        formattedSize: `${(175 + day * 11.4).toFixed(1)} MB`,
        status: "completed",
        deductedQuota: true,
        isDeleted: false,
        downloadToken: `seed_token_day_${day}_${Math.random().toString(36).substring(2, 10)}`,
        failureReason: null,
      });

      // Day 3: Grace period duplicate re-download (deductedQuota: false)
      if (day === 13) {
        records.push({
          userId: user._id,
          videoId: sampleVideo._id,
          downloadTimestamp: new Date(baseDate.getTime() + 3 * 3600 * 1000),
          ipAddress: dev.ip,
          device: dev.device,
          browser: dev.browser,
          os: dev.os,
          userAgent: dev.ua,
          deviceId: dev.deviceId,
          subscriptionPlan: planForDay,
          fileSize: 184500000 + day * 12000000,
          formattedSize: `${(175 + day * 11.4).toFixed(1)} MB`,
          status: "completed",
          deductedQuota: false, // 24-hour grace period!
          isDeleted: false,
          downloadToken: `seed_token_grace_${day}_${Math.random().toString(36).substring(2, 10)}`,
          failureReason: null,
        });
      }

      // Day 5: Interrupted download (status: failed)
      if (day === 11) {
        records.push({
          userId: user._id,
          videoId: sampleVideo._id,
          downloadTimestamp: new Date(baseDate.getTime() + 4 * 3600 * 1000),
          ipAddress: dev.ip,
          device: dev.device,
          browser: dev.browser,
          os: dev.os,
          userAgent: dev.ua,
          deviceId: dev.deviceId,
          subscriptionPlan: planForDay,
          fileSize: 420000000,
          formattedSize: "400.5 MB",
          status: "failed",
          deductedQuota: true,
          isDeleted: false,
          downloadToken: `seed_token_fail_${day}_${Math.random().toString(36).substring(2, 10)}`,
          failureReason: "Client connection closed before download finished.",
        });
      }

      // Day 11: I/O Storage stream failure (status: failed)
      if (day === 5) {
        records.push({
          userId: user._id,
          videoId: sampleVideo._id,
          downloadTimestamp: new Date(baseDate.getTime() + 6 * 3600 * 1000),
          ipAddress: dev.ip,
          device: dev.device,
          browser: dev.browser,
          os: dev.os,
          userAgent: dev.ua,
          deviceId: dev.deviceId,
          subscriptionPlan: planForDay,
          fileSize: 310000000,
          formattedSize: "295.6 MB",
          status: "failed",
          deductedQuota: true,
          isDeleted: false,
          downloadToken: `seed_token_iofail_${day}_${Math.random().toString(36).substring(2, 10)}`,
          failureReason: "EIO: i/o error, storage stream read timeout",
        });
      }
    }

    const inserted = await Download.insertMany(records);
    console.log(`Successfully seeded ${inserted.length} download audit records spanning 15 days.`);
  } catch (error) {
    console.error("Error seeding download logs:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seed15DaysLogs();
