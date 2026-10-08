import express from "express";
import {
  createMeeting,
  getMeeting,
  joinMeeting,
  endMeeting,
  toggleLock,
  updatePermissions,
  uploadMeetingAttachment,
} from "../controllers/meeting.js";
import { meetingUpload } from "../filehelper/meetingUpload.js";

const router = express.Router();

router.post("/create", createMeeting);
router.get("/:roomId", getMeeting);
router.post("/:roomId/join", joinMeeting);
router.post("/:roomId/end", endMeeting);
router.post("/:roomId/lock", toggleLock);
router.post("/:roomId/permissions", updatePermissions);
router.post("/upload", meetingUpload.single("file"), uploadMeetingAttachment);

export default router;
