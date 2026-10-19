import mongoose from "mongoose";

const securityOtpSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  tempToken: {
    type: String,
    required: true,
    unique: true,
  },
  loginPayload: {
    deviceId: String,
    deviceName: String,
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    deviceType: String,
    deviceModel: String,
    ip: String,
    city: String,
    state: String,
    country: String,
    location: String,
    anomalies: [String],
  },
  attempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // MongoDB TTL index: 10 minutes
  },
});

export default mongoose.model("securityOtp", securityOtpSchema);
