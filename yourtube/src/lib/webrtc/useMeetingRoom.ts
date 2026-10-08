import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

export interface Participant {
  socketId: string;
  userId: string;
  userName: string;
  userImage?: string;
  role: "host" | "cohost" | "participant";
  isMuted: boolean;
  isCameraOff: boolean;
  handRaised: boolean;
  isSpeaking: boolean;
  quality: "excellent" | "good" | "fair" | "poor";
  joinedAt?: string;
  isScreenSharing?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  message: string;
  type: "text" | "emoji" | "file" | "system";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  timestamp: string;
}

export interface RoomSettings {
  isLocked: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  hostId: string;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:openrelay.metered.ca:80" },
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
        "turns:openrelay.metered.ca:443?transport=tcp",
        "turn:standard.relay.metered.ca:80",
        "turn:standard.relay.metered.ca:443",
        "turn:standard.relay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:staticauth.openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayprojectsecret",
    },
  ],
  iceCandidatePoolSize: 10,
};

// Safe helper to construct and add ICE candidates without throwing on empty/end-of-candidates payloads
const addIceCandidateSafely = async (pc: RTCPeerConnection, cand: any) => {
  if (!cand) return;
  if (typeof cand.candidate === "undefined" && !cand.sdpMid && cand.sdpMLineIndex == null) return;
  try {
    if (cand.candidate === "") {
      await pc.addIceCandidate(cand);
    } else {
      await pc.addIceCandidate(new RTCIceCandidate(cand));
    }
  } catch (e) {
    try {
      await pc.addIceCandidate(cand);
    } catch {}
  }
};

const getSocketUrl = () => {
  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!isLocalhost) {
      return window.location.origin;
    }
  }
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:5000"
  );
};

export const useMeetingRoom = (roomId: string, initialUser: any) => {
  // Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  // Participants & Self State
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [selfParticipant, setSelfParticipant] = useState<Participant | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("YourTube Meeting");
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    isLocked: false,
    allowScreenShare: true,
    allowChat: true,
    hostId: "",
  });

  // Controls State
  const [isMuted, setIsMuted] = useState(Boolean(initialUser?.initialMuted));
  const [isCameraOff, setIsCameraOff] = useState(Boolean(initialUser?.initialCameraOff));
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [noiseSuppression, setNoiseSuppressionState] = useState(true);
  const [lowBandwidthMode, setLowBandwidthModeState] = useState(false);

  // Available Devices
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");

  // Chat & Reactions
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  // Call stats & recording
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "fair" | "poor">("excellent");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMeetingEnded, setIsMeetingEnded] = useState(false);

  // Refs for WebRTC & Socket
  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidateQueues = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isJoiningRef = useRef(false);
  const hasTriggeredJoin = useRef(false);
  const tabSessionIdRef = useRef<string>(
    typeof window !== "undefined"
      ? "tab_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now()
      : "tab_server"
  );

  // Update ref when stream updates
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  // Load available devices
  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setAudioInputDevices(audioInputs);
      setVideoInputDevices(videoInputs);
      if (!selectedAudioId && audioInputs.length > 0) setSelectedAudioId(audioInputs[0].deviceId);
      if (!selectedVideoId && videoInputs.length > 0) setSelectedVideoId(videoInputs[0].deviceId);
    } catch (e) {
      console.error("Error enumerating devices:", e);
    }
  }, [selectedAudioId, selectedVideoId]);

  useEffect(() => {
    refreshDevices();
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
      };
    }
  }, [refreshDevices]);

  // Audio level analyzer for speaking indicator
  const setupAudioAnalyzer = (stream: MediaStream) => {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let isLocalSpeaking = false;

      const checkVolume = () => {
        if (!analyserRef.current || !localStreamRef.current?.getAudioTracks()[0]?.enabled) {
          if (isLocalSpeaking) {
            isLocalSpeaking = false;
            setIsSpeaking(false);
            socketRef.current?.emit("speaking", { roomId, isSpeaking: false });
          }
          speakingTimeoutRef.current = setTimeout(checkVolume, 200);
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold for speech detection
        if (average > 15) {
          if (!isLocalSpeaking) {
            isLocalSpeaking = true;
            setIsSpeaking(true);
            socketRef.current?.emit("speaking", { roomId, isSpeaking: true });
          }
        } else {
          if (isLocalSpeaking) {
            isLocalSpeaking = false;
            setIsSpeaking(false);
            socketRef.current?.emit("speaking", { roomId, isSpeaking: false });
          }
        }

        speakingTimeoutRef.current = setTimeout(checkVolume, 200);
      };

      checkVolume();
    } catch (err) {
      console.warn("Audio analyzer setup failed (non-critical):", err);
    }
  };

  // Initialize Local Media Stream
  const initLocalStream = useCallback(
    async (
      audioDeviceId?: string,
      videoDeviceId?: string,
      facing: "user" | "environment" = facingMode,
      suppressNoise: boolean = noiseSuppression,
      lowBandwidth: boolean = lowBandwidthMode
    ) => {
      try {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: {
            deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: suppressNoise,
            autoGainControl: true,
          },
          video: lowBandwidth
            ? {
                deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
                facingMode: facing,
                width: { ideal: 480 },
                height: { ideal: 360 },
                frameRate: { max: 15 },
              }
            : {
                deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
                facingMode: facing,
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                frameRate: { ideal: 30, max: 60 },
              },
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (mediaErr: any) {
          console.warn("Could not get both audio and video, trying fallback:", mediaErr);
          // Fallback to audio only or video only if one device fails
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setIsCameraOff(true);
            toast.warning("Camera not accessible. Joined with audio only.");
          } catch {
            stream = new MediaStream();
            toast.error("Microphone/Camera permission denied. Joined in listen-only mode.");
          }
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setupAudioAnalyzer(stream);
        refreshDevices();

        // Update or add senders on existing peer connections
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        if (videoTrack && isCameraOff) {
          videoTrack.enabled = false;
        }
        if (audioTrack && isMuted) {
          audioTrack.enabled = false;
        }

        peerConnections.current.forEach((pc) => {
          const transceivers = pc.getTransceivers();

          if (videoTrack && !screenStreamRef.current) {
            const videoTransceiver = transceivers.find(
              (t) => t.sender.track?.kind === "video" || t.receiver.track.kind === "video"
            );
            if (videoTransceiver) {
              videoTransceiver.sender.replaceTrack(videoTrack).catch((e) => console.warn("replaceTrack video err:", e));
            }
          }

          if (audioTrack) {
            const audioTransceiver = transceivers.find(
              (t) => t.sender.track?.kind === "audio" || t.receiver.track.kind === "audio"
            );
            if (audioTransceiver) {
              audioTransceiver.sender.replaceTrack(audioTrack).catch((e) => console.warn("replaceTrack audio err:", e));
            }
          }
        });

        return stream;
      } catch (err: any) {
        console.error("Failed to get local stream:", err);
        setErrorMessage(err.message || "Failed to access camera and microphone.");
        return null;
      }
    },
    [facingMode, noiseSuppression, lowBandwidthMode, refreshDevices]
  );

  // Helper to attach or update local audio & video tracks to a peer connection without creating duplicate transceivers
  const attachLocalTracksToPeer = useCallback(async (pc: RTCPeerConnection) => {
    const activeStream = screenStreamRef.current || localStreamRef.current;
    const audioTrack = activeStream?.getAudioTracks()[0];
    const videoTrack = activeStream?.getVideoTracks()[0];

    const transceivers = pc.getTransceivers();

    // 1. Audio Transceiver
    const audioTransceiver = transceivers.find(
      (t) => t.sender.track?.kind === "audio" || t.receiver.track?.kind === "audio"
    );
    if (audioTransceiver) {
      if (audioTrack) {
        await audioTransceiver.sender.replaceTrack(audioTrack).catch(() => {});
        audioTransceiver.direction = "sendrecv";
      }
    } else {
      if (audioTrack) {
        try {
          pc.addTrack(audioTrack, activeStream!);
        } catch {}
      } else {
        try {
          pc.addTransceiver("audio", { direction: "sendrecv" });
        } catch {}
      }
    }

    // 2. Video Transceiver
    const videoTransceiver = transceivers.find(
      (t) => t.sender.track?.kind === "video" || t.receiver.track?.kind === "video"
    );
    if (videoTransceiver) {
      if (videoTrack && !screenStreamRef.current) {
        await videoTransceiver.sender.replaceTrack(videoTrack).catch(() => {});
        videoTransceiver.direction = "sendrecv";
      }
    } else {
      if (videoTrack) {
        try {
          pc.addTrack(videoTrack, activeStream!);
        } catch {}
      } else {
        try {
          pc.addTransceiver("video", { direction: "sendrecv" });
        } catch {}
      }
    }
  }, []);

  // WebRTC Peer Connection Helper
  const createPeerConnection = useCallback(
    (remoteSocketId: string, remoteUser?: Participant) => {
      const existing = peerConnections.current.get(remoteSocketId);
      if (existing && existing.connectionState !== "failed" && existing.connectionState !== "closed") {
        return existing;
      }

      if (existing) {
        try {
          existing.close();
        } catch {}
        peerConnections.current.delete(remoteSocketId);
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(remoteSocketId, pc);

      // Handle ICE Candidates with safe plain JSON serialization
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          const candidateData = event.candidate.toJSON
            ? event.candidate.toJSON()
            : {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                usernameFragment: event.candidate.usernameFragment,
              };
          socketRef.current.emit("ice-candidate", {
            toSocketId: remoteSocketId,
            candidate: candidateData,
          });
        }
      };

      // Remote stream received: Keep exactly one active track per kind (audio & video) without conflicts
      pc.ontrack = (event) => {
        console.log(`[WebRTC] ontrack from ${remoteSocketId}: kind=${event.track.kind}, id=${event.track.id}`);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          const current = next.get(remoteSocketId);

          let audioTrack: MediaStreamTrack | null = null;
          let videoTrack: MediaStreamTrack | null = null;

          // Preserve existing live tracks of the OTHER kind
          if (current) {
            const currentAudio = current.getAudioTracks()[0];
            const currentVideo = current.getVideoTracks()[0];
            if (currentAudio && currentAudio.readyState !== "ended") {
              audioTrack = currentAudio;
            }
            if (currentVideo && currentVideo.readyState !== "ended") {
              videoTrack = currentVideo;
            }
          }

          // Newly arrived track strictly takes over for its kind
          if (event.track.kind === "audio") {
            audioTrack = event.track;
          } else if (event.track.kind === "video") {
            videoTrack = event.track;
          }

          const tracks: MediaStreamTrack[] = [];
          if (audioTrack) tracks.push(audioTrack);
          if (videoTrack) tracks.push(videoTrack);

          const updatedStream = new MediaStream(tracks);
          next.set(remoteSocketId, updatedStream);
          return next;
        });
      };

      // Helper to trigger ICE restart & renegotiation
      const triggerIceRestart = async () => {
        if (!pc || pc.signalingState === "closed") return;
        console.warn(`[WebRTC] Initiating ICE restart for peer ${remoteSocketId}...`);
        try {
          if (typeof pc.restartIce === "function") {
            pc.restartIce();
          }
          await attachLocalTracksToPeer(pc);
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("signal-offer", {
            toSocketId: remoteSocketId,
            offer,
            fromUser: selfParticipant || undefined,
          });
        } catch (err) {
          console.warn(`[WebRTC] ICE restart failed for ${remoteSocketId}:`, err);
        }
      };

      // Connection State Change with automatic ICE recovery
      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Peer ${remoteSocketId} connection state: ${pc.connectionState}`);
        if (pc.connectionState === "failed") {
          triggerIceRestart();
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] Peer ${remoteSocketId} ICE state: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === "failed") {
          triggerIceRestart();
        }
      };

      return pc;
    },
    [attachLocalTracksToPeer, selfParticipant]
  );

  // Join Meeting via Socket.IO
  const joinMeeting = useCallback(
    async (userOverride?: any) => {
      const user = userOverride || initialUser;
      if (!roomId) return;

      if (!user || (!user._id && !user.id)) {
        toast.error("Please log in or sign in first to join this meeting");
        setIsConnecting(false);
        return;
      }

      // Synchronous ref guard: prevent duplicate concurrent calls or joining when already connected
      if (isJoiningRef.current || socketRef.current?.connected) {
        console.log("[useMeetingRoom] joinMeeting already in progress or connected, skipping duplicate invocation.");
        return;
      }

      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch {}
        socketRef.current = null;
      }

      isJoiningRef.current = true;
      setIsConnecting(true);
      setErrorMessage(null);

      try {
        // Make sure local stream is initialized
        let stream = localStreamRef.current;
        if (!stream) {
          stream = await initLocalStream();
        }

        const socket = io(getSocketUrl(), {
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          transports: ["polling", "websocket"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("Connected to signaling server with socket ID:", socket.id);
          socket.emit("join-room", {
            roomId,
            userId: user._id || user.id,
            userName: user.name || user.channelname || "User",
            userImage: user.image || "",
            role: "participant",
            tabSessionId: tabSessionIdRef.current,
            isMuted,
            isCameraOff,
          });
        });

        socket.on("error-message", (data) => {
          isJoiningRef.current = false;
          toast.error(data.message || "Failed to join room");
          setErrorMessage(data.message);
          setIsConnecting(false);
          if (data.message && data.message.toLowerCase().includes("invalid meeting code")) {
            try {
              socket.disconnect();
            } catch {}
          }
        });

        // Self joined room successfully
        socket.on("room-joined", async (data) => {
          isJoiningRef.current = false;
          setHasJoined(true);
          setIsConnecting(false);
          setSelfParticipant(data.self);
          setMeetingTitle(data.title || "YourTube Meeting");
          if (data.settings) setRoomSettings(data.settings);

        // Start synchronized call duration timer based on actual meeting start time
        const meetingStartTime = data.startedAt
          ? new Date(data.startedAt).getTime()
          : (callStartTimeRef.current || Date.now());
        callStartTimeRef.current = meetingStartTime;

        const initialElapsed = Math.max(0, Math.floor((Date.now() - meetingStartTime) / 1000));
        setCallDuration(initialElapsed);

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        timerIntervalRef.current = setInterval(() => {
          if (callStartTimeRef.current) {
            setCallDuration(Math.max(0, Math.floor((Date.now() - callStartTimeRef.current) / 1000)));
          }
        }, 1000);

        // Populate existing participants & establish peer connections
        const initialMap = new Map<string, Participant>();
        for (const p of data.participants) {
          initialMap.set(p.socketId, p);

          // Check if we already have an active/connected peer connection to this participant
          const existingPc = peerConnections.current.get(p.socketId);
          if (
            existingPc &&
            existingPc.signalingState !== "closed" &&
            (existingPc.connectionState === "connected" ||
              existingPc.connectionState === "connecting" ||
              existingPc.iceConnectionState === "connected")
          ) {
            console.log(`[WebRTC] Peer ${p.socketId} already active, skipping re-offer.`);
            continue;
          }

          // If old connection was closed/failed, clean it up before creating new one
          if (existingPc) {
            try {
              existingPc.close();
            } catch {}
            peerConnections.current.delete(p.socketId);
          }

          // For each existing user, create peer connection and send offer
          const pc = createPeerConnection(p.socketId, p);
          try {
            await attachLocalTracksToPeer(pc);
            if (pc.signalingState === "stable") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("signal-offer", {
                toSocketId: p.socketId,
                offer,
                fromUser: data.self,
              });
            }
          } catch (e) {
            console.error("Error creating WebRTC offer:", e);
          }
        }
        setParticipants(initialMap);
        toast.success(`Connected to room: ${roomId}`);
      });

      // Another user joined
      socket.on("user-joined", (participant: Participant) => {
        setParticipants((prev) => {
          const next = new Map(prev);
          next.set(participant.socketId, participant);
          return next;
        });
        toast.info(`${participant.userName} joined the meeting`);
      });

      // WebRTC Signal: Offer (Answerer side)
      socket.on("signal-offer", async ({ fromSocketId, offer, fromUser }) => {
        try {
          if (fromUser) {
            setParticipants((prev) => {
              if (prev.has(fromSocketId)) return prev;
              const next = new Map(prev);
              next.set(fromSocketId, fromUser);
              return next;
            });
          }

          const pc = createPeerConnection(fromSocketId, fromUser);

          // Handle glare if this peer already created a local offer (Perfect Negotiation)
          if (pc.signalingState === "have-local-offer") {
            const isPolite = socket.id ? socket.id > fromSocketId : true;
            if (!isPolite) {
              console.log(`[WebRTC] Glare detected with ${fromSocketId}. Impolite peer ignoring incoming offer.`);
              return;
            }
            try {
              await pc.setLocalDescription({ type: "rollback" } as any);
            } catch (rbErr) {
              console.warn("Rollback not supported or failed:", rbErr);
            }
          }

          await pc.setRemoteDescription(new RTCSessionDescription(offer));

          // Answerer attaches local media tracks to negotiated transceivers
          await attachLocalTracksToPeer(pc);

          // Process queued ICE candidates
          const queued = iceCandidateQueues.current.get(fromSocketId) || [];
          iceCandidateQueues.current.delete(fromSocketId);
          for (const cand of queued) {
            await addIceCandidateSafely(pc, cand);
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("signal-answer", { toSocketId: fromSocketId, answer });
        } catch (e) {
          console.error("Error handling offer:", e);
        }
      });

      // WebRTC Signal: Answer
      socket.on("signal-answer", async ({ fromSocketId, answer }) => {
        const pc = peerConnections.current.get(fromSocketId);
        if (pc) {
          try {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
              const queued = iceCandidateQueues.current.get(fromSocketId) || [];
              iceCandidateQueues.current.delete(fromSocketId);
              for (const cand of queued) {
                await addIceCandidateSafely(pc, cand);
              }
            } else {
              console.log(`[WebRTC] Peer ${fromSocketId} is in signaling state ${pc.signalingState}, skipping answer.`);
            }
          } catch (e) {
            console.error("Error handling answer:", e);
          }
        }
      });

      // WebRTC Signal: ICE Candidate
      socket.on("ice-candidate", async ({ fromSocketId, candidate }) => {
        if (!candidate) return;
        const pc = peerConnections.current.get(fromSocketId);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await addIceCandidateSafely(pc, candidate);
        } else {
          // Queue candidate until remote description is set
          const q = iceCandidateQueues.current.get(fromSocketId) || [];
          q.push(candidate);
          iceCandidateQueues.current.set(fromSocketId, q);
        }
      });

      // Remote Participant Updates
      socket.on("user-mute-status", ({ socketId, isMuted: muted }) => {
        setParticipants((prev) => {
          const next = new Map(prev);
          const p = next.get(socketId);
          if (p) next.set(socketId, { ...p, isMuted: muted });
          return next;
        });
      });

      socket.on("user-camera-status", ({ socketId, isCameraOff: camOff }) => {
        setParticipants((prev) => {
          const next = new Map(prev);
          const p = next.get(socketId);
          if (p) next.set(socketId, { ...p, isCameraOff: camOff });
          return next;
        });
      });

      socket.on("user-hand-status", ({ socketId, handRaised: raised, userName }) => {
        setParticipants((prev) => {
          const next = new Map(prev);
          const p = next.get(socketId);
          if (p) next.set(socketId, { ...p, handRaised: raised });
          return next;
        });
        if (raised) {
          toast(`${userName || "Someone"} raised hand ✋`);
        }
      });

      socket.on("user-speaking", ({ socketId, isSpeaking: speaking }) => {
        setParticipants((prev) => {
          const next = new Map(prev);
          const p = next.get(socketId);
          if (p) next.set(socketId, { ...p, isSpeaking: speaking });
          return next;
        });
      });

      socket.on("user-screen-share", ({ socketId, isSharing, userName }) => {
        setParticipants((prev) => {
          const next = new Map(prev);
          const p = next.get(socketId);
          if (p) next.set(socketId, { ...p, isScreenSharing: isSharing });
          return next;
        });
        if (isSharing) {
          toast.info(`${userName || "A participant"} started screen sharing`);
        }
      });

      socket.on("user-connection-quality", ({ socketId, quality }) => {
        setParticipants((prev) => {
          const next = new Map(prev);
          const p = next.get(socketId);
          if (p) next.set(socketId, { ...p, quality });
          return next;
        });
      });

      socket.on("user-role-updated", ({ socketId, role }) => {
        setParticipants((prev) => {
          const next = new Map(prev);
          const p = next.get(socketId);
          if (p) next.set(socketId, { ...p, role });
          return next;
        });
        if (socket.id === socketId) {
          setSelfParticipant((prev) => (prev ? { ...prev, role } : null));
          toast.info(`Your role was updated to: ${role}`);
        }
      });

      // Silently clean up replaced/evicted socket connection from the same browser tab without emitting departure toasts
      socket.on("socket-replaced", ({ oldSocketId }) => {
        const pc = peerConnections.current.get(oldSocketId);
        if (pc) {
          pc.close();
          peerConnections.current.delete(oldSocketId);
        }
        setRemoteStreams((prev) => {
          if (!prev.has(oldSocketId)) return prev;
          const next = new Map(prev);
          next.delete(oldSocketId);
          return next;
        });
        setParticipants((prev) => {
          if (!prev.has(oldSocketId)) return prev;
          const next = new Map(prev);
          next.delete(oldSocketId);
          return next;
        });
      });

      socket.on("user-left", ({ socketId, userName, userId }) => {
        // Clean up peer connection
        const pc = peerConnections.current.get(socketId);
        if (pc) {
          pc.close();
          peerConnections.current.delete(socketId);
        }
        setRemoteStreams((prev) => {
          if (!prev.has(socketId)) return prev;
          const next = new Map(prev);
          next.delete(socketId);
          return next;
        });
        setParticipants((prev) => {
          if (!prev.has(socketId)) return prev;
          const next = new Map(prev);
          next.delete(socketId);
          return next;
        });

        // NEVER show "X left" toast for current client/user self!
        const isCurrentSelf =
          socket.id === socketId ||
          (selfParticipant && (selfParticipant.socketId === socketId || selfParticipant.userId === userId));

        if (!isCurrentSelf && userName) {
          toast.info(`${userName} left`);
        }
      });

      // Chat & Reactions
      socket.on("receive-chat", (msg: ChatMessage) => {
        setChatMessages((prev) => [...prev, msg]);
        if (!isChatOpen && msg.type !== "system") {
          setUnreadChatCount((prev) => prev + 1);
        }
      });

      socket.on("receive-reaction", (reaction: FloatingReaction) => {
        setReactions((prev) => [...prev, reaction]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
        }, 3000);
      });

      // Moderation Events
      socket.on("force-mute", ({ by }) => {
        if (localStreamRef.current) {
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = false;
            setIsMuted(true);
          }
        }
        toast.warning(`You were muted by ${by || "the host"}`);
      });

      socket.on("force-removed", ({ reason }) => {
        toast.error(reason || "You were removed from the meeting.");
        setIsMeetingEnded(true);
        leaveMeeting();
      });

      socket.on("room-lock-status", ({ isLocked }) => {
        setRoomSettings((prev) => ({ ...prev, isLocked }));
        toast.info(isLocked ? "Meeting is now locked 🔒" : "Meeting is now unlocked 🔓");
      });

      socket.on("permissions-updated", ({ allowScreenShare, allowChat }) => {
        setRoomSettings((prev) => ({ ...prev, allowScreenShare, allowChat }));
        toast.info("Meeting permissions updated by host");
      });

      socket.on("meeting-ended", ({ reason }) => {
        toast.error(reason || "The host has ended the meeting for all participants.");
        setIsMeetingEnded(true);
        leaveMeeting();
      });
    } catch (err: any) {
      console.error("Error in joinMeeting:", err);
      isJoiningRef.current = false;
      setIsConnecting(false);
    }
  },
  [roomId, initialUser, initLocalStream, createPeerConnection, isChatOpen]
);

  // Toggle Microphone
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMuted(newMuted);
        socketRef.current?.emit("toggle-mute", { roomId, isMuted: newMuted });
      }
    }
  }, [roomId]);

  // Toggle Camera
  const toggleCamera = useCallback(async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newCamOff = !videoTrack.enabled;
        setIsCameraOff(newCamOff);
        socketRef.current?.emit("toggle-camera", { roomId, isCameraOff: newCamOff });
      } else {
        setIsCameraOff(false);
        await initLocalStream(selectedAudioId, selectedVideoId, facingMode, noiseSuppression, lowBandwidthMode);
        socketRef.current?.emit("toggle-camera", { roomId, isCameraOff: false });
      }
    } else {
      await initLocalStream();
    }
  }, [roomId, selectedAudioId, selectedVideoId, facingMode, noiseSuppression, lowBandwidthMode, initLocalStream]);

  // Switch Camera Facing Mode (front/rear on mobile)
  const switchCamera = useCallback(async () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    await initLocalStream(selectedAudioId, undefined, nextFacing);
    toast.info(`Switched to ${nextFacing === "user" ? "Front" : "Rear"} Camera`);
  }, [facingMode, selectedAudioId, initLocalStream]);

  // Change Audio Device
  const setAudioDevice = useCallback(
    async (deviceId: string) => {
      setSelectedAudioId(deviceId);
      await initLocalStream(deviceId, selectedVideoId);
      toast.success("Microphone updated");
    },
    [selectedVideoId, initLocalStream]
  );

  // Change Video Device
  const setVideoDevice = useCallback(
    async (deviceId: string) => {
      setSelectedVideoId(deviceId);
      await initLocalStream(selectedAudioId, deviceId);
      toast.success("Camera updated");
    },
    [selectedAudioId, initLocalStream]
  );

  // Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (!roomSettings.allowScreenShare && selfParticipant?.role === "participant") {
      toast.error("Screen sharing has been disabled by the host.");
      return;
    }

    if (isScreenSharing) {
      // Stop sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      socketRef.current?.emit("screen-share-status", { roomId, isSharing: false });

      // Revert to camera track on peer connections
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        peerConnections.current.forEach((pc) => {
          pc.getSenders().forEach((sender) => {
            if (sender.track?.kind === "video") {
              sender.replaceTrack(videoTrack);
            }
          });
        });
      }
    } else {
      // Start sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        setScreenStream(stream);
        setIsScreenSharing(true);
        socketRef.current?.emit("screen-share-status", { roomId, isSharing: true });

        const screenVideoTrack = stream.getVideoTracks()[0];

        // When user stops screen sharing via browser native UI bar
        screenVideoTrack.onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          socketRef.current?.emit("screen-share-status", { roomId, isSharing: false });
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (camTrack) {
            peerConnections.current.forEach((pc) => {
              pc.getSenders().forEach((sender) => {
                if (sender.track?.kind === "video") {
                  sender.replaceTrack(camTrack);
                }
              });
            });
          }
        };

        // Replace track on peer connections with screen share track
        peerConnections.current.forEach((pc) => {
          pc.getSenders().forEach((sender) => {
            if (sender.track?.kind === "video") {
              sender.replaceTrack(screenVideoTrack);
            }
          });
        });
      } catch (err: any) {
        if (err.name !== "NotAllowedError") {
          console.error("Screen share error:", err);
          toast.error("Failed to share screen");
        }
      }
    }
  }, [isScreenSharing, roomSettings.allowScreenShare, selfParticipant?.role, roomId]);

  // Toggle Hand Raise
  const toggleHandRaise = useCallback(() => {
    const nextHand = !handRaised;
    setHandRaised(nextHand);
    socketRef.current?.emit("toggle-hand", { roomId, handRaised: nextHand });
    if (nextHand) toast("Hand raised ✋");
  }, [handRaised, roomId]);

  // Send Chat Message
  const sendChatMessage = useCallback(
    (text: string, fileData?: { fileUrl: string; fileName: string; fileSize: number }) => {
      if (!roomSettings.allowChat && selfParticipant?.role === "participant") {
        toast.error("Chat is disabled by the host.");
        return;
      }
      if (!text.trim() && !fileData) return;

      socketRef.current?.emit("send-chat", {
        roomId,
        message: text,
        type: fileData ? "file" : "text",
        fileUrl: fileData?.fileUrl,
        fileName: fileData?.fileName,
        fileSize: fileData?.fileSize,
        senderId: selfParticipant?.userId || "user",
        senderName: selfParticipant?.userName || "You",
        senderImage: selfParticipant?.userImage || "",
      });
    },
    [roomId, roomSettings.allowChat, selfParticipant]
  );

  // Send Floating Reaction
  const sendReaction = useCallback(
    (emoji: string) => {
      socketRef.current?.emit("send-reaction", {
        roomId,
        emoji,
        senderName: selfParticipant?.userName || "You",
      });
    },
    [roomId, selfParticipant]
  );

  // Call Recording (Local MediaRecorder composite)
  const startRecording = useCallback(async () => {
    try {
      if (typeof MediaRecorder === "undefined") {
        toast.error("Recording is not supported in this browser.");
        return;
      }

      let activeStream = screenStreamRef.current || localStreamRef.current;
      let liveTracks = activeStream?.getTracks().filter((t) => t.readyState === "live") || [];

      // If no local tracks are live (e.g. joined without camera/mic), offer screen/tab capture
      if (liveTracks.length === 0) {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
          try {
            toast.info("Select a screen or browser tab to record the meeting...");
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            });
            activeStream = displayStream;
            liveTracks = displayStream.getTracks();
          } catch (dispErr: any) {
            console.warn("Screen recording request cancelled:", dispErr);
            toast.warning("Cannot start recording: No active camera, mic, or screen capture selected.");
            return;
          }
        } else {
          toast.warning("Cannot record: Please turn on your microphone, camera, or screen share first.");
          return;
        }
      }

      if (liveTracks.length === 0) {
        toast.warning("Cannot start recording: No active audio or video tracks available.");
        return;
      }

      // Create a clean stream with only live tracks
      const recordStream = new MediaStream(liveTracks);
      const hasVideo = liveTracks.some((t) => t.kind === "video");
      const hasAudio = liveTracks.some((t) => t.kind === "audio");

      recordedChunksRef.current = [];
      let mimeType: string | undefined = undefined;

      if (hasVideo) {
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mimeType = "video/webm;codecs=vp9,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
          mimeType = "video/webm;codecs=vp8,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm")) {
          mimeType = "video/webm";
        } else if (MediaRecorder.isTypeSupported("video/mp4")) {
          mimeType = "video/mp4";
        }
      } else if (hasAudio) {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(recordStream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) return;
        const type = mimeType || (hasVideo ? "video/webm" : "audio/webm");
        const ext = hasVideo ? (type.includes("mp4") ? "mp4" : "webm") : "webm";
        const blob = new Blob(recordedChunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `yourtube-recording-${roomId}-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        toast.success("Meeting recording saved to downloads!");
      };

      // Auto stop if user stops screen capture
      liveTracks.forEach((track) => {
        track.onended = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          }
        };
      });

      recorder.start(1000); // 1-second chunks
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      toast.info("Call recording started 🔴");
    } catch (err: any) {
      console.error("Failed to start recording:", err);
      setIsRecording(false);
      toast.error(err?.message || "Recording could not be started in this browser.");
    }
  }, [roomId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  }, [isRecording]);

  // Host Moderation Controls
  const muteParticipant = useCallback(
    (targetSocketId: string, targetUserId: string) => {
      socketRef.current?.emit("host-mute-user", {
        roomId,
        targetSocketId,
        targetUserId,
      });
      toast.info("Muted participant");
    },
    [roomId]
  );

  const muteAll = useCallback(() => {
    socketRef.current?.emit("host-mute-all", { roomId });
    toast.info("Muted all participants");
  }, [roomId]);

  const removeParticipant = useCallback(
    (targetSocketId: string, targetUserId: string, reason?: string) => {
      socketRef.current?.emit("host-remove-user", {
        roomId,
        targetSocketId,
        targetUserId,
        reason: reason || "Removed by meeting host",
      });
      toast.info("Removed participant from call");
    },
    [roomId]
  );

  const toggleRoomLock = useCallback(() => {
    const nextLocked = !roomSettings.isLocked;
    socketRef.current?.emit("host-toggle-lock", {
      roomId,
      isLocked: nextLocked,
    });
  }, [roomId, roomSettings.isLocked]);

  const setParticipantRole = useCallback(
    (targetSocketId: string, targetUserId: string, role: "cohost" | "participant") => {
      socketRef.current?.emit("host-set-role", {
        roomId,
        targetSocketId,
        targetUserId,
        role,
      });
    },
    [roomId]
  );

  const updatePermissions = useCallback(
    (allowScreenShare: boolean, allowChat: boolean) => {
      socketRef.current?.emit("host-update-permissions", {
        roomId,
        allowScreenShare,
        allowChat,
      });
    },
    [roomId]
  );

  // Leave Meeting
  const leaveMeeting = useCallback(() => {
    stopRecording();

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    callStartTimeRef.current = null;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setHasJoined(false);
    setParticipants(new Map());
    setRemoteStreams(new Map());
    setCallDuration(0);
    isJoiningRef.current = false;
    hasTriggeredJoin.current = false;
  }, [stopRecording]);

  // End Meeting for All (Host only)
  const endMeetingForAll = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("end-meeting", { roomId });
    }
    setTimeout(() => {
      leaveMeeting();
    }, 200);
  }, [roomId, leaveMeeting]);

  // Toggle Noise Suppression
  const toggleNoiseSuppression = useCallback(
    async (enabled: boolean) => {
      setNoiseSuppressionState(enabled);
      await initLocalStream(selectedAudioId, selectedVideoId, facingMode, enabled, lowBandwidthMode);
      toast.info(enabled ? "Noise suppression enabled" : "Noise suppression disabled");
    },
    [selectedAudioId, selectedVideoId, facingMode, lowBandwidthMode, initLocalStream]
  );

  // Toggle Low Bandwidth Mode
  const toggleLowBandwidthMode = useCallback(
    async (enabled: boolean) => {
      setLowBandwidthModeState(enabled);
      await initLocalStream(selectedAudioId, selectedVideoId, facingMode, noiseSuppression, enabled);
      toast.info(enabled ? "Low bandwidth mode activated (360p 15fps)" : "HD quality restored (720p 30fps)");
    },
    [selectedAudioId, selectedVideoId, facingMode, noiseSuppression, initLocalStream]
  );

  // Automatically join the meeting when roomId and user are provided (strictly once per mount)
  useEffect(() => {
    if (!roomId) return;
    const user = initialUser;
    if (!user || (!user._id && !user.id)) return;

    if (!hasTriggeredJoin.current && !socketRef.current?.connected && !isJoiningRef.current) {
      hasTriggeredJoin.current = true;
      joinMeeting(user);
    }
  }, [roomId, initialUser, joinMeeting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hasTriggeredJoin.current = false;
      leaveMeeting();
    };
  }, [leaveMeeting]);

  const isHost = selfParticipant?.role === "host";
  const isCoHost = selfParticipant?.role === "cohost";

  return {
    // Streams
    localStream,
    screenStream,
    remoteStreams,

    // Participants & Self
    participants,
    selfParticipant,
    meetingTitle,
    roomSettings,
    isHost,
    isCoHost,

    // State
    isMuted,
    isCameraOff,
    isScreenSharing,
    handRaised,
    isSpeaking,
    facingMode,
    noiseSuppression,
    lowBandwidthMode,
    callDuration,
    connectionQuality,
    isRecording,
    recordingDuration,
    hasJoined,
    isConnecting,
    errorMessage,
    isMeetingEnded,

    // Devices
    audioInputDevices,
    videoInputDevices,
    selectedAudioId,
    selectedVideoId,

    // Chat & Reactions
    chatMessages,
    unreadChatCount,
    isChatOpen,
    setIsChatOpen,
    reactions,

    // Actions
    initLocalStream,
    joinMeeting,
    leaveMeeting,
    endMeetingForAll,
    toggleMic,
    toggleCamera,
    switchCamera,
    setAudioDevice,
    setVideoDevice,
    toggleScreenShare,
    toggleHandRaise,
    sendChatMessage,
    sendReaction,
    startRecording,
    stopRecording,
    muteParticipant,
    muteAll,
    removeParticipant,
    toggleRoomLock,
    setParticipantRole,
    updatePermissions,
    toggleNoiseSuppression,
    toggleLowBandwidthMode,
  };
};
