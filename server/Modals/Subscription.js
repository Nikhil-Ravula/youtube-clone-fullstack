import mongoose from "mongoose";

const subscriptionSchema = mongoose.Schema({
  channelId: { type: String, required: true },
  channelName: { type: String },
  subscriberId: { type: String, required: true },
  subscribedAt: { type: Date, default: Date.now },
});

// Avoid duplicate subscriptions from the same user to the same channel
subscriptionSchema.index({ channelId: 1, subscriberId: 1 }, { unique: true });

export default mongoose.model("subscription", subscriptionSchema);
