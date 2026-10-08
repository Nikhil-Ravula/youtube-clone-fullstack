import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userImage: { type: String, default: "" },
  role: { type: String, enum: ["host", "cohost", "participant"], default: "participant" },
  joinedAt: { type: Date, default: Date.now },
  isMuted: { type: Boolean, default: false },
  isCameraOff: { type: Boolean, default: false },
  handRaised: { type: Boolean, default: false },
});

const chatMessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  message: { type: String, default: "" },
  type: { type: String, enum: ["text", "emoji", "file", "system"], default: "text" },
  fileUrl: { type: String, default: "" },
  fileName: { type: String, default: "" },
  fileSize: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

const meetingSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: "YourTube Meeting" },
    hostId: { type: String, required: true },
    hostName: { type: String, default: "Host" },
    participants: [participantSchema],
    chatMessages: [chatMessageSchema],
    isLocked: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    maxParticipants: { type: Number, default: 12 },
    allowScreenShare: { type: Boolean, default: true },
    allowChat: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("meeting", meetingSchema);
