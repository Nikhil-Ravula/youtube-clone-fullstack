/**
 * Comprehensive Subscription Plans Configuration
 * Plans: Free, Bronze, Silver, Gold
 * Billing cycles: monthly (30d), quarterly (90d), yearly (365d)
 */

export const SUBSCRIPTION_PLANS = {
  Free: {
    id: "Free",
    name: "Free Tier",
    tagline: "Essential video streaming & community access",
    badge: "Basic",
    color: {
      badge: "bg-gray-100 text-gray-800 border-gray-300",
      accent: "border-gray-200 bg-gray-50/50",
      primary: "bg-gray-800 hover:bg-gray-900 text-white",
    },
    pricing: {
      monthly: { amount: 0, period: "forever", durationDays: 0, savings: null },
      quarterly: { amount: 0, period: "forever", durationDays: 0, savings: null },
      yearly: { amount: 0, period: "forever", durationDays: 0, savings: null },
    },
    limits: {
      dailyDownloads: 1,
      maxQuality: "480p SD",
      adFree: false,
      offlineDownloads: false,
      priorityStreaming: false,
      exclusiveCourses: false,
      registeredDevices: 1,
      premiumVideoAccess: "Limited (30s preview)",
      premiumWatchTimeLimitSec: 30,
    },
    renewalPolicy: "Free forever. No billing or credit card required.",
    upgradeEligibility: ["Bronze", "Silver", "Gold"],
    features: [
      "Standard quality streaming (up to 480p SD)",
      "1 video download per 24 hours",
      "Standard platform features & community access",
      "Standard video player with ads",
      "Single device active registration",
      "Limited 30-second preview on exclusive content",
    ],
  },
  Bronze: {
    id: "Bronze",
    name: "Bronze Plus",
    tagline: "HD streaming and increased daily downloads",
    badge: "Popular Starter",
    color: {
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      accent: "border-amber-400 bg-amber-50/40",
      primary: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    pricing: {
      monthly: { amount: 199, period: "/month", durationDays: 30, savings: null },
      quarterly: { amount: 499, period: "/3 months", durationDays: 90, savings: "Save 16%" },
      yearly: { amount: 1799, period: "/year", durationDays: 365, savings: "Save 25%" },
    },
    limits: {
      dailyDownloads: 5,
      maxQuality: "720p HD",
      adFree: false,
      offlineDownloads: true,
      priorityStreaming: true,
      exclusiveCourses: false,
      registeredDevices: 2,
      premiumVideoAccess: "Extended (3 min preview)",
      premiumWatchTimeLimitSec: 180,
    },
    renewalPolicy: "Renews automatically at the end of each billing cycle. Cancel anytime from your dashboard.",
    upgradeEligibility: ["Silver", "Gold"],
    features: [
      "720p High Definition video streaming",
      "5 video downloads every 24 hours",
      "Offline downloads & faster download queue",
      "2 registered devices with simultaneous access",
      "Extended preview on premium videos (up to 3 min)",
      "Priority customer email support",
    ],
  },
  Silver: {
    id: "Silver",
    name: "Silver Pro",
    tagline: "Full HD 1080p, completely ad-free & offline downloads",
    badge: "Most Popular",
    color: {
      badge: "bg-slate-200 text-slate-800 border-slate-400",
      accent: "border-slate-400 bg-slate-50 ring-1 ring-slate-300",
      primary: "bg-slate-800 hover:bg-slate-900 text-white",
    },
    pricing: {
      monthly: { amount: 499, period: "/month", durationDays: 30, savings: null },
      quarterly: { amount: 1299, period: "/3 months", durationDays: 90, savings: "Save 13%" },
      yearly: { amount: 4499, period: "/year", durationDays: 365, savings: "Save 25%" },
    },
    limits: {
      dailyDownloads: 15,
      maxQuality: "1080p Full HD",
      adFree: true,
      offlineDownloads: true,
      priorityStreaming: true,
      exclusiveCourses: false,
      registeredDevices: 4,
      premiumVideoAccess: "Unlimited Full Access",
      premiumWatchTimeLimitSec: 0, // unlimited
    },
    renewalPolicy: "Renews automatically at the end of each cycle. Cancel anytime with 1-click.",
    upgradeEligibility: ["Gold"],
    features: [
      "1080p Full HD high-bitrate streaming",
      "15 video downloads every day",
      "100% Ad-Free uninterrupted viewing",
      "Full offline downloads with 24h grace renewals",
      "Unlimited access to all premium standard videos",
      "High-speed CDN bandwidth allocation",
      "Up to 4 registered devices",
      "Priority support with under 4h response time",
    ],
  },
  Gold: {
    id: "Gold",
    name: "Gold VIP",
    tagline: "4K Ultra HD, exclusive courses, unlimited access & VIP badge",
    badge: "Ultimate Experience",
    color: {
      badge: "bg-yellow-100 text-yellow-800 border-yellow-400",
      accent: "border-yellow-500 bg-yellow-50/50 ring-2 ring-yellow-400 shadow-md",
      primary: "bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-bold",
    },
    pricing: {
      monthly: { amount: 999, period: "/month", durationDays: 30, savings: null },
      quarterly: { amount: 2499, period: "/3 months", durationDays: 90, savings: "Save 17%" },
      yearly: { amount: 8999, period: "/year", durationDays: 365, savings: "Save 25%" },
    },
    limits: {
      dailyDownloads: 50,
      maxQuality: "4K Ultra HD & 60 FPS",
      adFree: true,
      offlineDownloads: true,
      priorityStreaming: true,
      exclusiveCourses: true,
      registeredDevices: 10,
      premiumVideoAccess: "Unlimited Full Access + Courses",
      premiumWatchTimeLimitSec: 0, // unlimited
    },
    renewalPolicy: "Renews automatically at the end of each cycle. Cancel anytime without penalty.",
    upgradeEligibility: [],
    features: [
      "4K Ultra HD & 60 FPS cinematic streaming",
      "50 video downloads daily (unlimited practical capacity)",
      "Completely Ad-Free viewing across all devices",
      "Exclusive access to Premium Masterclasses & Courses",
      "VIP Profile Badge & Priority content early-access",
      "Fastest dedicated edge-streaming bandwidth",
      "Up to 10 simultaneous registered devices",
      "24/7 dedicated VIP phone & email support",
    ],
  },
};

/**
 * Generates unique professional invoice number (e.g., INV-202610-748291)
 */
export const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `INV-${year}${month}-${randomPart}`;
};

/**
 * Checks if a user's subscription has expired and automatically downgrades
 * them to Free while completely preserving user data, history, and uploaded content.
 */
export const checkAndSyncSubscription = async (userDoc) => {
  if (!userDoc) return null;

  const now = new Date();
  const currentPlan = userDoc.subscriptionPlan || "Free";

  // If user is on a paid plan but the expiry date is in the past
  if (currentPlan !== "Free" && userDoc.planExpiresAt && new Date(userDoc.planExpiresAt) < now) {
    userDoc.subscriptionPlan = "Free";
    userDoc.subscriptionStatus = "expired";
    userDoc.autoRenew = false;
    await userDoc.save();
    return {
      plan: "Free",
      isExpired: true,
      downgraded: true,
      userDoc,
    };
  }

  return {
    plan: currentPlan,
    isExpired: false,
    downgraded: false,
    userDoc,
  };
};
