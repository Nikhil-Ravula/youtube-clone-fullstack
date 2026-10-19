import video from "../Modals/video.js";
import history from "../Modals/history.js";

export const handlehistory = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  try {
    const existing = await history.findOne({ viewer: userId, videoid: videoId });
    if (existing) {
      existing.lastWatchedAt = new Date();
      await existing.save();
    } else {
      await history.create({ viewer: userId, videoid: videoId });
      await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    }
    return res.status(200).json({ history: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const savewatchprogress = async (req, res) => {
  const { videoId } = req.params;
  const { userId, progressSec = 0, percentage = 0, completionThreshold = 90 } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID required" });
  }

  try {
    const isCompleted = Number(percentage) >= Number(completionThreshold);
    const updated = await history.findOneAndUpdate(
      { viewer: userId, videoid: videoId },
      {
        $set: {
          watchProgress: Math.max(0, Number(progressSec)),
          watchPercentage: Math.min(100, Math.max(0, Number(percentage))),
          isCompleted,
          lastWatchedAt: new Date(),
        },
        $setOnInsert: {
          viewer: userId,
          videoid: videoId,
          likedon: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      progress: updated.watchProgress,
      percentage: updated.watchPercentage,
      isCompleted: updated.isCompleted,
    });
  } catch (error) {
    console.error("Error saving watch progress:", error);
    return res.status(500).json({ message: "Failed to save watch progress" });
  }
};

export const getwatchprogress = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(200).json({ progress: 0, percentage: 0, isCompleted: false });
  }

  try {
    const record = await history.findOne({ viewer: userId, videoid: videoId });
    if (!record) {
      return res.status(200).json({ progress: 0, percentage: 0, isCompleted: false });
    }

    return res.status(200).json({
      progress: record.watchProgress || 0,
      percentage: record.watchPercentage || 0,
      isCompleted: record.isCompleted || false,
      lastWatchedAt: record.lastWatchedAt,
    });
  } catch (error) {
    console.error("Error getting watch progress:", error);
    return res.status(500).json({ message: "Failed to fetch progress" });
  }
};

export const handleview = async (req, res) => {
  const { videoId } = req.params;
  try {
    await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    return res.status(200).json({ views: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const historyvideo = await history
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .sort({ lastWatchedAt: -1, updatedAt: -1 })
      .exec();
    return res.status(200).json(historyvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletehistory = async (req, res) => {
  const { id } = req.params;
  try {
    await history.findByIdAndDelete(id);
    return res.status(200).json({ message: "History item removed" });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
