import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      default: "User",
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    paymentId: {
      type: String,
      default: null,
      index: true,
    },
    signature: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    subscriptionPlan: {
      type: String,
      enum: ["Free", "Bronze", "Silver", "Gold"],
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: "monthly",
    },
    durationDays: {
      type: Number,
      default: 30,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "failed", "cancelled", "pending"],
      default: "pending",
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
    subscriptionStartDate: {
      type: Date,
      default: Date.now,
    },
    subscriptionExpiryDate: {
      type: Date,
      required: true,
    },
    renewalInfo: {
      autoRenew: { type: Boolean, default: true },
      cancelledAt: { type: Date, default: null },
      renewalPolicy: {
        type: String,
        default: "Renews automatically at the end of billing cycle unless cancelled.",
      },
    },
    paymentMethod: {
      type: String,
      default: "Razorpay",
    },
    supportContact: {
      email: { type: String, default: "support@yourtube.com" },
      phone: { type: String, default: "+91 800-YOURTUBE" },
      hours: { type: String, default: "24/7 Dedicated Support" },
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Transaction", transactionSchema);
