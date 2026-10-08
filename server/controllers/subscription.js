import subscription from "../Modals/Subscription.js";

export const toggleSubscription = async (req, res) => {
  const { channelId, subscriberId, channelName } = req.body;
  if (!channelId || !subscriberId) {
    return res.status(400).json({ message: "Missing channelId or subscriberId" });
  }

  if (channelId === subscriberId) {
    return res.status(400).json({ message: "You cannot subscribe to your own channel" });
  }

  try {
    const existing = await subscription.findOne({ channelId, subscriberId });
    if (existing) {
      await subscription.findByIdAndDelete(existing._id);
      const count = await subscription.countDocuments({ channelId });
      return res.status(200).json({ isSubscribed: false, count });
    } else {
      await subscription.create({ channelId, subscriberId, channelName });
      const count = await subscription.countDocuments({ channelId });
      return res.status(200).json({ isSubscribed: true, count });
    }
  } catch (error) {
    console.error("Subscription toggle error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getSubscriptionStatus = async (req, res) => {
  const { channelId } = req.params;
  const { subscriberId } = req.query;

  try {
    const count = await subscription.countDocuments({ channelId });
    let isSubscribed = false;
    if (subscriberId) {
      const existing = await subscription.findOne({ channelId, subscriberId });
      isSubscribed = !!existing;
    }
    return res.status(200).json({ count, isSubscribed });
  } catch (error) {
    console.error("Get subscription status error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getUserSubscriptions = async (req, res) => {
  const { subscriberId } = req.params;

  try {
    const subs = await subscription.find({ subscriberId });
    return res.status(200).json(subs);
  } catch (error) {
    console.error("Get user subscriptions error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
