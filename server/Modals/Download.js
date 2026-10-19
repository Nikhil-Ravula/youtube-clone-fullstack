import mongoose from "mongoose";

const downloadSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
      index: true,
    },
    downloadTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ipAddress: {
      type: String,
      default: "Unknown",
    },
    device: {
      type: String,
      default: "Desktop",
    },
    browser: {
      type: String,
      default: "Unknown",
    },
    os: {
      type: String,
      default: "Unknown",
    },
    userAgent: {
      type: String,
      default: "",
    },
    deviceId: {
      type: String,
      default: "",
    },
    subscriptionPlan: {
      type: String,
      enum: ["Free", "Bronze", "Silver", "Gold"],
      default: "Free",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    formattedSize: {
      type: String,
      default: "0 MB",
    },
    status: {
      type: String,
      enum: ["in-progress", "completed", "failed"],
      default: "in-progress",
      index: true,
    },
    deductedQuota: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    downloadToken: {
      type: String,
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user's recent downloads for a specific video (24h grace period lookup)
downloadSchema.index({ userId: 1, videoId: 1, downloadTimestamp: -1 });

export default mongoose.model("download", downloadSchema);
