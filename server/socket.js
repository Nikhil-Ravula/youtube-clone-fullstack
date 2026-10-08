import { Server } from "socket.io";
import Meeting from "./Modals/meeting.js";

// Helper to normalize room code (e.g. "380a04f624" -> "380-a04f-624" or strip URLs)
const normalizeRoomId = (raw) => {
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

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // In-memory state tracking: roomId -> Map(socketId -> participantData)
  const roomParticipants = new Map();
  // socketId -> { roomId, userId }
  const socketToRoom = new Map();
  // roomId -> { isLocked, allowScreenShare, allowChat, hostId }
  const roomSettings = new Map();
  // roomId -> Date (Synchronized call start timestamp)
  const roomStartTimes = new Map();

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room
    socket.on("join-room", async (data) => {
      try {
        const { roomId, userId, userName, userImage, role = "participant", tabSessionId, isMuted = false, isCameraOff = false } = data;
        if (!roomId || !userId || userId.startsWith("guest-")) {
          socket.emit("error-message", { message: "Please log in or sign in first to join this meeting" });
          return;
        }

        // Normalize room code to match DB format
        const normalizedId = normalizeRoomId(roomId);

        // Fetch meeting info from database
        let dbMeeting = null;
        try {
          dbMeeting = await Meeting.findOne({
            $or: [{ roomId }, { roomId: normalizedId }],
            isActive: true,
          });
        } catch (err) {
          console.error("DB error finding meeting:", err);
        }

        // VALIDATION: Reject invalid or non-existent meeting codes!
        if (!dbMeeting) {
          socket.emit("error-message", {
            message: "Invalid meeting code. This meeting does not exist or has already ended.",
          });
          return;
        }

        // Always use canonical roomId from DB so all devices join the EXACT same room
        const canonicalRoomId = dbMeeting.roomId;

        // Check if locked
        const currentSettings = roomSettings.get(canonicalRoomId) || {
          isLocked: dbMeeting?.isLocked || false,
          allowScreenShare: dbMeeting?.allowScreenShare ?? true,
          allowChat: dbMeeting?.allowChat ?? true,
          hostId: dbMeeting?.hostId || userId,
        };
        roomSettings.set(canonicalRoomId, currentSettings);

        const isHost = currentSettings.hostId === userId || role === "host";

        if (currentSettings.isLocked && !isHost) {
          socket.emit("error-message", { message: "This meeting is locked by the host." });
          return;
        }

        if (!roomParticipants.has(canonicalRoomId)) {
          roomParticipants.set(canonicalRoomId, new Map());
        }
        const participants = roomParticipants.get(canonicalRoomId);

        // Check max participants limit
        const maxParticipants = dbMeeting?.maxParticipants || 12;
        if (participants.size >= maxParticipants && !participants.has(socket.id)) {
          socket.emit("error-message", { message: `Meeting is full (max ${maxParticipants} participants).` });
          return;
        }

        // Determine and synchronize meeting start time across all participants
        let roomStartTime = roomStartTimes.get(canonicalRoomId);
        if (!roomStartTime) {
          roomStartTime = dbMeeting?.startedAt || dbMeeting?.createdAt || new Date();
          roomStartTimes.set(canonicalRoomId, roomStartTime);
        }

        // Cleanly evict previous socket only if reconnecting/reloading from the EXACT same browser tab
        if (tabSessionId) {
          for (const [sId, pData] of participants.entries()) {
            if (pData.tabSessionId === tabSessionId && sId !== socket.id) {
              participants.delete(sId);
              socketToRoom.delete(sId);
              // Cleanly notify peers to release the stale socket connection without displaying a false "user left" popup
              io.to(canonicalRoomId).emit("socket-replaced", {
                oldSocketId: sId,
                newSocketId: socket.id,
              });
              const oldSocket = io.sockets.sockets.get(sId);
              if (oldSocket) {
                try {
                  oldSocket.leave(canonicalRoomId);
                  oldSocket.disconnect(true);
                } catch {}
              }
            }
          }
        }

        const participantData = {
          socketId: socket.id,
          userId,
          tabSessionId: tabSessionId || socket.id,
          userName: userName || "Participant",
          userImage: userImage || "",
          role: isHost ? "host" : role,
          isMuted: Boolean(isMuted),
          isCameraOff: Boolean(isCameraOff),
          handRaised: false,
          isSpeaking: false,
          quality: "excellent",
          joinedAt: new Date(),
        };

        participants.set(socket.id, participantData);
        socketToRoom.set(socket.id, { roomId: canonicalRoomId, userId });

        socket.join(canonicalRoomId);

        // Send existing participants & settings back to the joining user
        const existingParticipantsList = Array.from(participants.values()).filter(
          (p) => p.socketId !== socket.id
        );

        socket.emit("room-joined", {
          roomId: canonicalRoomId,
          self: participantData,
          participants: existingParticipantsList,
          settings: currentSettings,
          title: dbMeeting?.title || "YourTube Meeting",
          startedAt: roomStartTime,
        });

        // Notify other participants in the room
        socket.to(canonicalRoomId).emit("user-joined", participantData);

        // System message in chat
        io.to(canonicalRoomId).emit("receive-chat", {
          id: `${Date.now()}-${Math.random()}`,
          senderId: "system",
          senderName: "System",
          message: `${participantData.userName} joined the meeting`,
          type: "system",
          timestamp: new Date().toISOString(),
        });

        console.log(`User ${participantData.userName} (${userId}) joined room ${canonicalRoomId}. Total: ${participants.size}`);
      } catch (err) {
        console.error("Error in join-room:", err);
        socket.emit("error-message", { message: "Failed to join room" });
      }
    });

    // WebRTC Signaling: Offer
    socket.on("signal-offer", ({ toSocketId, offer, fromUser }) => {
      if (toSocketId) {
        io.to(toSocketId).emit("signal-offer", {
          fromSocketId: socket.id,
          offer,
          fromUser,
        });
      }
    });

    // WebRTC Signaling: Answer
    socket.on("signal-answer", ({ toSocketId, answer }) => {
      if (toSocketId) {
        io.to(toSocketId).emit("signal-answer", {
          fromSocketId: socket.id,
          answer,
        });
      }
    });

    // WebRTC Signaling: ICE Candidate
    socket.on("ice-candidate", ({ toSocketId, candidate }) => {
      if (toSocketId && candidate) {
        io.to(toSocketId).emit("ice-candidate", {
          fromSocketId: socket.id,
          candidate,
        });
      }
    });

    // State sync: Mute
    socket.on("toggle-mute", ({ roomId, isMuted }) => {
      const canonicalRoomId = normalizeRoomId(roomId) || roomId;
      const room = roomParticipants.get(canonicalRoomId) || roomParticipants.get(roomId);
      if (room && room.has(socket.id)) {
        room.get(socket.id).isMuted = isMuted;
        const payload = {
          socketId: socket.id,
          userId: room.get(socket.id).userId,
          isMuted,
        };
        io.to(canonicalRoomId).emit("user-mute-status", payload);
        if (canonicalRoomId !== roomId) io.to(roomId).emit("user-mute-status", payload);
      }
    });

    // State sync: Camera
    socket.on("toggle-camera", ({ roomId, isCameraOff }) => {
      const canonicalRoomId = normalizeRoomId(roomId) || roomId;
      const room = roomParticipants.get(canonicalRoomId) || roomParticipants.get(roomId);
      if (room && room.has(socket.id)) {
        room.get(socket.id).isCameraOff = isCameraOff;
        const payload = {
          socketId: socket.id,
          userId: room.get(socket.id).userId,
          isCameraOff,
        };
        io.to(canonicalRoomId).emit("user-camera-status", payload);
        if (canonicalRoomId !== roomId) io.to(roomId).emit("user-camera-status", payload);
      }
    });

    // State sync: Hand Raise
    socket.on("toggle-hand", ({ roomId, handRaised }) => {
      const canonicalRoomId = normalizeRoomId(roomId) || roomId;
      const room = roomParticipants.get(canonicalRoomId) || roomParticipants.get(roomId);
      if (room && room.has(socket.id)) {
        room.get(socket.id).handRaised = handRaised;
        const payload = {
          socketId: socket.id,
          userId: room.get(socket.id).userId,
          handRaised,
          userName: room.get(socket.id).userName,
        };
        io.to(canonicalRoomId).emit("user-hand-status", payload);
        if (canonicalRoomId !== roomId) io.to(roomId).emit("user-hand-status", payload);
      }
    });

    // State sync: Speaking indicator
    socket.on("speaking", ({ roomId, isSpeaking }) => {
      const canonicalRoomId = normalizeRoomId(roomId) || roomId;
      const room = roomParticipants.get(canonicalRoomId) || roomParticipants.get(roomId);
      if (room && room.has(socket.id)) {
        room.get(socket.id).isSpeaking = isSpeaking;
        const payload = {
          socketId: socket.id,
          userId: room.get(socket.id).userId,
          isSpeaking,
        };
        io.to(canonicalRoomId).emit("user-speaking", payload);
        if (canonicalRoomId !== roomId) io.to(roomId).emit("user-speaking", payload);
      }
    });

    // State sync: Screen share
    socket.on("screen-share-status", ({ roomId, isSharing }) => {
      const canonicalRoomId = normalizeRoomId(roomId) || roomId;
      const room = roomParticipants.get(canonicalRoomId) || roomParticipants.get(roomId);
      if (room && room.has(socket.id)) {
        const payload = {
          socketId: socket.id,
          userId: room.get(socket.id).userId,
          userName: room.get(socket.id).userName,
          isSharing,
        };
        io.to(canonicalRoomId).emit("user-screen-share", payload);
        if (canonicalRoomId !== roomId) io.to(roomId).emit("user-screen-share", payload);
      }
    });

    // State sync: Connection Quality
    socket.on("connection-quality", ({ roomId, quality }) => {
      const canonicalRoomId = normalizeRoomId(roomId) || roomId;
      const room = roomParticipants.get(canonicalRoomId) || roomParticipants.get(roomId);
      if (room && room.has(socket.id)) {
        room.get(socket.id).quality = quality;
        const payload = {
          socketId: socket.id,
          userId: room.get(socket.id).userId,
          quality,
        };
        io.to(canonicalRoomId).emit("user-connection-quality", payload);
        if (canonicalRoomId !== roomId) io.to(roomId).emit("user-connection-quality", payload);
      }
    });

    // Chat messages
    socket.on("send-chat", async (chatData) => {
      const { roomId, message, type = "text", fileUrl, fileName, fileSize, senderId, senderName, senderImage } = chatData;
      const canonicalRoomId = normalizeRoomId(roomId) || roomId;
      const settings = roomSettings.get(canonicalRoomId) || roomSettings.get(roomId);
      if (settings && !settings.allowChat && settings.hostId !== senderId) {
        socket.emit("error-message", { message: "In-call chat has been disabled by host." });
        return;
      }

      const msgObj = {
        id: `${Date.now()}-${Math.random()}`,
        senderId,
        senderName: senderName || "Anonymous",
        senderImage: senderImage || "",
        message: message || "",
        type,
        fileUrl: fileUrl || "",
        fileName: fileName || "",
        fileSize: fileSize || 0,
        timestamp: new Date().toISOString(),
      };

      io.to(canonicalRoomId).emit("receive-chat", msgObj);
      if (canonicalRoomId !== roomId) {
        io.to(roomId).emit("receive-chat", msgObj);
      }

      // Persist in meeting document asynchronously
      try {
        await Meeting.updateOne(
          { $or: [{ roomId }, { roomId: canonicalRoomId }] },
          {
            $push: {
              chatMessages: {
                senderId,
                senderName: senderName || "Anonymous",
                message: message || "",
                type,
                fileUrl: fileUrl || "",
                timestamp: new Date(),
              },
            },
          }
        );
      } catch (err) {
        console.error("Error saving chat message to DB:", err);
      }
    });

    // Floating reaction emojis
    socket.on("send-reaction", ({ roomId, emoji, senderName }) => {
      io.to(roomId).emit("receive-reaction", {
        id: `${Date.now()}-${Math.random()}`,
        emoji,
        senderName,
      });
    });

    // Host Moderation: Mute User
    socket.on("host-mute-user", ({ roomId, targetSocketId, targetUserId }) => {
      const room = roomParticipants.get(roomId);
      const requester = room?.get(socket.id);
      if (requester && (requester.role === "host" || requester.role === "cohost")) {
        io.to(targetSocketId).emit("force-mute", { by: requester.userName });
        if (room.has(targetSocketId)) {
          room.get(targetSocketId).isMuted = true;
          io.to(roomId).emit("user-mute-status", {
            socketId: targetSocketId,
            userId: targetUserId,
            isMuted: true,
          });
        }
      }
    });

    // Host Moderation: Mute All
    socket.on("host-mute-all", ({ roomId }) => {
      const room = roomParticipants.get(roomId);
      const requester = room?.get(socket.id);
      if (requester && (requester.role === "host" || requester.role === "cohost")) {
        for (const [sId, pData] of room.entries()) {
          if (sId !== socket.id) {
            io.to(sId).emit("force-mute", { by: requester.userName });
            pData.isMuted = true;
            io.to(roomId).emit("user-mute-status", {
              socketId: sId,
              userId: pData.userId,
              isMuted: true,
            });
          }
        }
      }
    });

    // Host Moderation: Remove User
    socket.on("host-remove-user", ({ roomId, targetSocketId, targetUserId, reason }) => {
      const room = roomParticipants.get(roomId);
      const requester = room?.get(socket.id);
      if (requester && (requester.role === "host" || requester.role === "cohost")) {
        io.to(targetSocketId).emit("force-removed", {
          reason: reason || "You were removed from the meeting by the host.",
        });
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.leave(roomId);
        }
        if (room) {
          const removedUser = room.get(targetSocketId);
          room.delete(targetSocketId);
          socketToRoom.delete(targetSocketId);
          io.to(roomId).emit("user-left", {
            socketId: targetSocketId,
            userId: targetUserId,
            userName: removedUser?.userName,
            reason: "removed_by_host",
          });
        }
      }
    });

    // Host Moderation: Toggle Room Lock
    socket.on("host-toggle-lock", async ({ roomId, isLocked }) => {
      const room = roomParticipants.get(roomId);
      const requester = room?.get(socket.id);
      if (requester && (requester.role === "host" || requester.role === "cohost")) {
        const settings = roomSettings.get(roomId) || {};
        settings.isLocked = isLocked;
        roomSettings.set(roomId, settings);
        io.to(roomId).emit("room-lock-status", { isLocked });

        try {
          await Meeting.updateOne({ roomId }, { isLocked });
        } catch (e) {
          console.error("Failed to update lock status in DB:", e);
        }
      }
    });

    // Host Moderation: Assign/Demote Co-Host
    socket.on("host-set-role", ({ roomId, targetSocketId, targetUserId, role }) => {
      const room = roomParticipants.get(roomId);
      const requester = room?.get(socket.id);
      if (requester && requester.role === "host") {
        if (room && room.has(targetSocketId)) {
          room.get(targetSocketId).role = role;
          io.to(roomId).emit("user-role-updated", {
            socketId: targetSocketId,
            userId: targetUserId,
            role,
          });
        }
      }
    });

    // Host Moderation: Update Permissions
    socket.on("host-update-permissions", async ({ roomId, allowScreenShare, allowChat }) => {
      const room = roomParticipants.get(roomId);
      const requester = room?.get(socket.id);
      if (requester && (requester.role === "host" || requester.role === "cohost")) {
        const settings = roomSettings.get(roomId) || {};
        if (typeof allowScreenShare === "boolean") settings.allowScreenShare = allowScreenShare;
        if (typeof allowChat === "boolean") settings.allowChat = allowChat;
        roomSettings.set(roomId, settings);

        io.to(roomId).emit("permissions-updated", {
          allowScreenShare: settings.allowScreenShare,
          allowChat: settings.allowChat,
        });

        try {
          await Meeting.updateOne({ roomId }, {
            allowScreenShare: settings.allowScreenShare,
            allowChat: settings.allowChat,
          });
        } catch (e) {
          console.error("Failed to update permissions in DB:", e);
        }
      }
    });

    // Host Moderation: End Meeting for All
    socket.on("end-meeting", async ({ roomId }) => {
      const canonicalRoomId = normalizeRoomId(roomId) || roomId;
      const room = roomParticipants.get(canonicalRoomId) || roomParticipants.get(roomId);
      const requester = room?.get(socket.id);
      let isHost = requester?.role === "host";

      if (!isHost) {
        try {
          const userEntry = socketToRoom.get(socket.id);
          const dbMeeting = await Meeting.findOne({
            $or: [{ roomId }, { roomId: canonicalRoomId }],
          });
          if (dbMeeting && userEntry && dbMeeting.hostId === userEntry.userId) {
            isHost = true;
          }
        } catch (e) {}
      }

      if (isHost || !room || room.size <= 1) {
        io.to(canonicalRoomId).emit("meeting-ended", {
          reason: "The host has ended the meeting for all participants.",
        });
        if (roomId !== canonicalRoomId) {
          io.to(roomId).emit("meeting-ended", {
            reason: "The host has ended the meeting for all participants.",
          });
        }

        try {
          await Meeting.updateOne(
            { $or: [{ roomId }, { roomId: canonicalRoomId }] },
            { isActive: false, endedAt: new Date() }
          );
        } catch (e) {
          console.error("Failed to mark meeting inactive in DB:", e);
        }

        roomParticipants.delete(canonicalRoomId);
        roomParticipants.delete(roomId);
        roomSettings.delete(canonicalRoomId);
        roomSettings.delete(roomId);
        roomStartTimes.delete(canonicalRoomId);
        roomStartTimes.delete(roomId);
      }
    });

    // Disconnection handler
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const userEntry = socketToRoom.get(socket.id);
      if (userEntry) {
        const { roomId, userId } = userEntry;
        socketToRoom.delete(socket.id);

        const room = roomParticipants.get(roomId);
        if (room && room.has(socket.id)) {
          const departing = room.get(socket.id);
          room.delete(socket.id);

          io.to(roomId).emit("user-left", {
            socketId: socket.id,
            userId,
            userName: departing?.userName,
          });

          io.to(roomId).emit("receive-chat", {
            id: `${Date.now()}-${Math.random()}`,
            senderId: "system",
            senderName: "System",
            message: `${departing?.userName || "A participant"} left the meeting`,
            type: "system",
            timestamp: new Date().toISOString(),
          });

          // If no participants remain, clean up room after grace period
          if (room.size === 0) {
            setTimeout(() => {
              if (roomParticipants.get(roomId)?.size === 0) {
                roomParticipants.delete(roomId);
                roomSettings.delete(roomId);
              }
            }, 60000);
          }
        }
      }
    });
  });

  return io;
};
