import express from "express";
import {
  getUserQuota,
  authorizeDownload,
  streamDownloadFile,
  getUserDownloads,
  upgradeSubscriptionPlan,
  deleteDownloadRecord,
} from "../controllers/download.js";

const router = express.Router();

// Get user download quota & plan status
router.get("/quota/:userId", getUserQuota);

// Pre-download authorization & grace period verification
router.post("/authorize", authorizeDownload);

// Secure streaming download execution
router.get("/file/:videoId", streamDownloadFile);

// User's dedicated downloads history list
router.get("/user/:userId", getUserDownloads);

// Subscription plan upgrade/switch
router.post("/plan/upgrade", upgradeSubscriptionPlan);

// Remove download record from user list
router.delete("/record/:id", deleteDownloadRecord);

export default router;
