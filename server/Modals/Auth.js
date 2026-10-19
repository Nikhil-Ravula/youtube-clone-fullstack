import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  subscriptionPlan: {
    type: String,
    enum: ["Free", "Bronze", "Silver", "Gold"],
    default: "Free",
  },
  planExpiresAt: { type: Date, default: null },
  billingCycle: {
    type: String,
    enum: ["monthly", "quarterly", "yearly", "none"],
    default: "none",
  },
  subscriptionStatus: {
    type: String,
    enum: ["active", "expired", "cancelled", "none"],
    default: "none",
  },
  autoRenew: { type: Boolean, default: false },
  subscriptionStartDate: { type: Date, default: null },
  lastPaymentId: { type: String, default: null },
  lastOrderId: { type: String, default: null },
  lastInvoiceNumber: { type: String, default: null },
  theme: {
    type: String,
    enum: ["light", "dark"],
    default: "dark",
  },
  themePreference: {
    type: String,
    enum: ["auto", "light", "dark"],
    default: "auto",
  },
  registeredDevices: [
    {
      deviceId: { type: String },
      deviceName: { type: String },
      lastUsed: { type: Date, default: Date.now },
    },
  ],
  trustedDevices: [
    {
      deviceId: { type: String, required: true },
      deviceName: { type: String },
      browser: { type: String },
      browserVersion: { type: String },
      os: { type: String },
      osVersion: { type: String },
      deviceType: { type: String, default: "Desktop" },
      deviceModel: { type: String },
      ip: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      location: { type: String },
      trustedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date },
      lastActive: { type: Date, default: Date.now },
    },
  ],
  knownBrowsers: [{ type: String }],
  knownIps: [{ type: String }],
  knownLocations: [
    {
      city: { type: String },
      state: { type: String },
      country: { type: String },
      location: { type: String },
    },
  ],
  lastLoginAt: { type: Date },
  lastLoginIp: { type: String },
  lastLoginDevice: { type: String },
  lastLoginLocation: { type: String },
});

export default mongoose.model("user", userschema);
