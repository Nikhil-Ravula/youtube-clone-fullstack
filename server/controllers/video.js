import video from "../Modals/video.js";
import users from "../Modals/Auth.js";
import { checkAndSyncSubscription, SUBSCRIPTION_PLANS } from "../utils/plansConfig.js";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: req.file.path.replace(/\\/g, "/"),
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
        isPremium: req.body.isPremium === "true" || req.body.isPremium === true,
        requiredPlan: req.body.requiredPlan || (req.body.isCourse ? "Gold" : "Silver"),
        isCourse: req.body.isCourse === "true" || req.body.isCourse === true,
        courseTitle: req.body.courseTitle || "",
      });

      await file.save();
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};

export const getallvideo = async (req, res) => {
  try {
    const files = await video.find().sort({ createdAt: -1 });
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * Checks video access permissions based on user subscription plan
 */
export const checkVideoAccess = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.query;

  try {
    const videoDoc = await video.findById(videoId);
    if (!videoDoc) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    let userPlan = "Free";
    let isExpired = false;

    if (userId) {
      const userDoc = await users.findById(userId);
      if (userDoc) {
        const syncRes = await checkAndSyncSubscription(userDoc);
        userPlan = syncRes.plan;
        isExpired = syncRes.isExpired;
      }
    }

    const planConfig = SUBSCRIPTION_PLANS[userPlan] || SUBSCRIPTION_PLANS.Free;
    const isPremium = !!videoDoc.isPremium;
    const isCourse = !!videoDoc.isCourse;
    const requiredPlan = videoDoc.requiredPlan || "Silver";

    const PLAN_RANK = { Free: 0, Bronze: 1, Silver: 2, Gold: 3 };
    const userRank = PLAN_RANK[userPlan] || 0;
    const reqRank = PLAN_RANK[requiredPlan] || 2;

    let hasFullAccess = true;
    let previewDurationSec = 0;
    let reason = null;

    if (isCourse) {
      // Exclusive courses require Gold
      if (userPlan !== "Gold") {
        hasFullAccess = false;
        previewDurationSec = userPlan === "Free" ? 30 : 60;
        reason = "Exclusive Premium Course. Gold VIP Membership required for complete access.";
      }
    } else if (isPremium) {
      if (userRank < reqRank) {
        hasFullAccess = false;
        previewDurationSec = userPlan === "Bronze" ? 180 : 30;
        reason = `Premium Video. Upgrade to ${requiredPlan} or higher for unlimited viewing.`;
      }
    }

    return res.status(200).json({
      success: true,
      hasFullAccess,
      userPlan,
      isExpired,
      isPremium,
      isCourse,
      requiredPlan,
      maxQualityAllowed: planConfig.limits.maxQuality,
      adFree: planConfig.limits.adFree,
      previewDurationSec,
      reason,
    });
  } catch (error) {
    console.error("Error checking video access:", error);
    return res.status(500).json({ success: false, message: "Error verifying video access" });
  }
};

/**
 * Toggle or set video as premium / course for test demonstration
 */
export const setVideoPremiumStatus = async (req, res) => {
  const { id } = req.params;
  const { isPremium, requiredPlan, isCourse, courseTitle } = req.body;

  try {
    const updated = await video.findByIdAndUpdate(
      id,
      {
        $set: {
          isPremium: isPremium !== undefined ? isPremium : true,
          requiredPlan: requiredPlan || "Silver",
          isCourse: isCourse !== undefined ? isCourse : false,
          courseTitle: courseTitle || "",
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    return res.status(200).json({ success: true, video: updated });
  } catch (error) {
    console.error("Error setting video premium status:", error);
    return res.status(500).json({ success: false, message: "Failed to update video" });
  }
};

