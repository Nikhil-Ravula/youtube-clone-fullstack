import mongoose from "mongoose";

const loginRecordSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  deviceId: {
    type: String,
  },
  ip: {
    type: String,
    required: true,
  },
  browser: {
    type: String,
    required: true,
  },
  browserVersion: {
    type: String,
  },
  os: {
    type: String,
    required: true,
  },
  osVersion: {
    type: String,
  },
  deviceType: {
    type: String,
    enum: ["Desktop", "Mobile", "Tablet"],
    default: "Desktop",
  },
  deviceModel: {
    type: String,
    default: "Personal Computer",
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  country: {
    type: String,
  },
  location: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["SUCCESS", "OTP_REQUIRED", "OTP_VERIFIED", "OTP_FAILED", "REVOKED"],
    default: "SUCCESS",
  },
  reason: {
    type: String,
  },
  isTrustedDevice: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("loginRecord", loginRecordSchema);
