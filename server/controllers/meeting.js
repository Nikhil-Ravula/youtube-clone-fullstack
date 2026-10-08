import Meeting from "../Modals/meeting.js";
import { v4 as uuidv4 } from "uuid";

// Create a new meeting room
export const createMeeting = async (req, res) => {
  try {
    const { hostId, hostName, title, maxParticipants } = req.body;
    if (!hostId || hostId.startsWith("guest-")) {
      return res.status(401).json({ message: "Please log in or sign in first to create a meeting" });
    }
    // Generate clean 10-character alphanumeric room ID (e.g. abc-defg-hij or 10 chars)
    const rawId = uuidv4().replace(/-/g, "").slice(0, 10);
    const roomId = `${rawId.slice(0, 3)}-${rawId.slice(3, 7)}-${rawId.slice(7)}`;

    const meeting = new Meeting({
      roomId,
      title: title || "YourTube Meeting",
      hostId,
      hostName: hostName || "Host",
      maxParticipants: maxParticipants || 12,
      participants: [
        {
          userId: hostId,
          userName: hostName || "Host",
          role: "host",
        },
      ],
    });
    await meeting.save();
    return res.status(201).json(meeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    return res.status(500).json({ message: "Failed to create meeting", error: error.message });
  }
};

// Helper to normalize room code (e.g. "380a04f624" -> "380-a04f-624" or strips spaces/URLs)
export const normalizeRoomId = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  let cleaned = raw.trim().toLowerCase();
  if (cleaned.includes("/meet/")) {
    const parts = cleaned.split("/meet/");
    cleaned = parts[parts.length - 1];
  }
  cleaned = cleaned.split("?")[0].replace(/\/+$/, "");
  const alphanumericOnly = cleaned.replace(/[^a-z0-9]/g, "");
  if (alphanumericOnly.length === 10) {
    return `${alphanumericOnly.slice(0, 3)}-${alphanumericOnly.slice(3, 7)}-${alphanumericOnly.slice(7)}`;
  }
  return cleaned;
};

// Get meeting details by roomId
export const getMeeting = async (req, res) => {
  try {
    const { roomId } = req.params;
    const normalized = normalizeRoomId(roomId);
    const meeting = await Meeting.findOne({
      $or: [{ roomId }, { roomId: normalized }],
      isActive: true,
    });
    if (!meeting) {
      return res.status(404).json({ message: "Invalid meeting code. This meeting does not exist or has already ended." });
    }
    return res.status(200).json(meeting);
  } catch (error) {
    console.error("Error getting meeting:", error);
    return res.status(500).json({ message: "Failed to get meeting" });
  }
};

// Join meeting verification
export const joinMeeting = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, userName, userImage } = req.body;
    if (!userId || userId.startsWith("guest-")) {
      return res.status(401).json({ message: "Please log in or sign in first to join a meeting" });
    }
    const normalized = normalizeRoomId(roomId);
    const meeting = await Meeting.findOne({
      $or: [{ roomId }, { roomId: normalized }],
      isActive: true,
    });
    if (!meeting) {
      return res.status(404).json({ message: "Invalid meeting code. This meeting does not exist or has already ended." });
    }
    if (meeting.isLocked && meeting.hostId !== userId) {
      return res.status(403).json({ message: "Meeting is locked by the host" });
    }
    if (meeting.participants.length >= meeting.maxParticipants && !meeting.participants.some(p => p.userId === userId)) {
      return res.status(403).json({ message: "Meeting is full" });
    }

    const existingIndex = meeting.participants.findIndex((p) => p.userId === userId);
    if (existingIndex === -1) {
      meeting.participants.push({
        userId,
        userName: userName || "Participant",
        userImage: userImage || "",
        role: meeting.hostId === userId ? "host" : "participant",
      });
      await meeting.save();
    }
    return res.status(200).json(meeting);
  } catch (error) {
    console.error("Error joining meeting:", error);
    return res.status(500).json({ message: "Failed to join meeting" });
  }
};

// End meeting
export const endMeeting = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId } = req.body;
    const meeting = await Meeting.findOne({ roomId });
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    if (meeting.hostId !== hostId) {
      return res.status(403).json({ message: "Only the host can end the meeting" });
    }
    meeting.isActive = false;
    meeting.endedAt = new Date();
    await meeting.save();
    return res.status(200).json({ message: "Meeting ended", meeting });
  } catch (error) {
    console.error("Error ending meeting:", error);
    return res.status(500).json({ message: "Failed to end meeting" });
  }
};

// Toggle meeting room lock
export const toggleLock = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId } = req.body;
    const meeting = await Meeting.findOne({ roomId, isActive: true });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    if (meeting.hostId !== hostId) return res.status(403).json({ message: "Only the host can lock/unlock" });
    meeting.isLocked = !meeting.isLocked;
    await meeting.save();
    return res.status(200).json({ isLocked: meeting.isLocked });
  } catch (error) {
    return res.status(500).json({ message: "Failed to toggle lock" });
  }
};

// Update meeting permissions (screen share, chat)
export const updatePermissions = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId, allowScreenShare, allowChat } = req.body;
    const meeting = await Meeting.findOne({ roomId, isActive: true });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    if (meeting.hostId !== hostId) return res.status(403).json({ message: "Only host can update permissions" });

    if (typeof allowScreenShare === "boolean") meeting.allowScreenShare = allowScreenShare;
    if (typeof allowChat === "boolean") meeting.allowChat = allowChat;
    await meeting.save();

    return res.status(200).json({
      allowScreenShare: meeting.allowScreenShare,
      allowChat: meeting.allowChat,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update permissions" });
  }
};

// Upload chat attachment
export const uploadMeetingAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }
    const filePath = req.file.path.replace(/\\/g, "/");
    const fileUrl = `${req.protocol}://${req.get("host")}/${filePath}`;

    return res.status(200).json({
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });
  } catch (error) {
    console.error("Error uploading meeting file:", error);
    return res.status(500).json({ message: "File upload failed" });
  }
};
