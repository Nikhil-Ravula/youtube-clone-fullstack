import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { PreJoinScreen } from "@/components/meet/PreJoinScreen";
import { MeetingRoom } from "@/components/meet/MeetingRoom";
import { SettingsModal } from "@/components/meet/SettingsModal";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Loader2, AlertCircle, Lock, User } from "lucide-react";
import { toast } from "sonner";

export default function MeetingRoomPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const { user, handlegooglesignin } = useUser();

  const [hasJoined, setHasJoined] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("YourTube Meeting");
  const [isCheckingRoom, setIsCheckingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Local media stream for pre-join preview
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Devices
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);

  // User display info
  const [participantUser, setParticipantUser] = useState<any>(null);

  // Refresh available devices
  const loadDevices = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);
      if (!selectedAudioId && audioInputs.length > 0) setSelectedAudioId(audioInputs[0].deviceId);
      if (!selectedVideoId && videoInputs.length > 0) setSelectedVideoId(videoInputs[0].deviceId);
    } catch (e) {
      console.error("Device enumerate error:", e);
    }
  };

  // Start preview stream
  const initPreviewStream = async (audioId?: string, videoId?: string, facing: "user" | "environment" = facingMode) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: audioId ? { exact: audioId } : undefined,
          noiseSuppression,
          echoCancellation: true,
        },
        video: {
          deviceId: videoId ? { exact: videoId } : undefined,
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setPreviewStream(stream);
      await loadDevices();
    } catch (err: any) {
      console.warn("Could not get audio and video preview:", err);
      // Fallback
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setPreviewStream(audioOnly);
        setIsCameraOff(true);
      } catch {
        // Continue with empty stream
      }
    }
  };

  // Check room status from backend
  useEffect(() => {
    if (!roomId || typeof roomId !== "string") return;

    const checkRoom = async () => {
      try {
        setIsCheckingRoom(true);
        setRoomError(null);
        const res = await axiosInstance.get(`/meeting/${roomId}`);
        if (res.data) {
          setMeetingTitle(res.data.title || "YourTube Meeting");
          if (res.data.isLocked && res.data.hostId !== (user?._id || user?.id)) {
            setRoomError("This meeting is locked by the host.");
          }
          // If room ID was entered without dashes, update URL to canonical format
          if (res.data.roomId && res.data.roomId !== roomId) {
            router.replace(`/meet/${res.data.roomId}`, undefined, { shallow: true });
          }
        }
      } catch (err: any) {
        console.warn("Meeting verification failed:", err?.response?.data || err);
        const errorMsg =
          err?.response?.data?.message ||
          "Invalid meeting code. This meeting does not exist or has already ended.";
        setRoomError(errorMsg);
      } finally {
        setIsCheckingRoom(false);
      }
    };

    checkRoom();
  }, [roomId, user]);

  // Init preview when room is ready and not yet joined
  useEffect(() => {
    if (!hasJoined) {
      initPreviewStream();
    }

    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [hasJoined]);

  const toggleMicPreview = () => {
    if (previewStream) {
      const audioTrack = previewStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCameraPreview = () => {
    if (previewStream) {
      const videoTrack = previewStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const switchCameraFacing = async () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    await initPreviewStream(selectedAudioId, undefined, nextFacing);
  };

  const handleJoinRoom = async (displayName: string) => {
    if (!user) {
      setJoinError("Please log in or sign in first to join this meeting.");
      toast.error("Please log in or sign in first to join this meeting");
      handlegooglesignin();
      return;
    }
    setJoinError(null);

    // Stop pre-join preview tracks before joining so MeetingRoom hook gets clean device lock
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    }

    const customUser = {
      _id: user._id || user.id,
      name: displayName || user.name || user.channelname || "Host",
      image: user.image || "",
      channelname: user.channelname || user.name || displayName,
      initialMuted: isMuted,
      initialCameraOff: isCameraOff,
    };
    setParticipantUser(customUser);

    try {
      // Register with backend
      await axiosInstance.post(`/meeting/${roomId}/join`, {
        userId: customUser._id,
        userName: customUser.name,
        userImage: customUser.image,
      });
    } catch (e: any) {
      console.warn("Backend join notification (non-critical):", e?.response?.data || e);
    }

    setHasJoined(true);
  };

  if (!roomId || typeof roomId !== "string") {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-lg">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Invalid Meeting Code</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">{roomError}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm pt-2">
          <button
            onClick={() => router.push("/meet")}
            className="w-full py-3 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-lg transition-all cursor-pointer"
          >
            Return to Meet Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{meetingTitle} - YourTube Meet</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        {!hasJoined ? (
          <>
            <PreJoinScreen
              roomId={roomId}
              meetingTitle={meetingTitle}
              initialName={user?.name || user?.channelname || ""}
              localStream={previewStream}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              onToggleMic={toggleMicPreview}
              onToggleCamera={toggleCameraPreview}
              onSwitchCamera={switchCameraFacing}
              onJoin={handleJoinRoom}
              onOpenSettings={() => setIsSettingsOpen(true)}
              isConnecting={isCheckingRoom}
              errorMessage={joinError}
            />

            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              audioDevices={audioDevices}
              videoDevices={videoDevices}
              selectedAudioId={selectedAudioId}
              selectedVideoId={selectedVideoId}
              onSelectAudioDevice={(id) => {
                setSelectedAudioId(id);
                initPreviewStream(id, selectedVideoId);
              }}
              onSelectVideoDevice={(id) => {
                setSelectedVideoId(id);
                initPreviewStream(selectedAudioId, id);
              }}
              noiseSuppression={noiseSuppression}
              onToggleNoiseSuppression={(enabled) => setNoiseSuppression(enabled)}
              lowBandwidthMode={lowBandwidthMode}
              onToggleLowBandwidthMode={(enabled) => setLowBandwidthMode(enabled)}
              roomId={roomId}
            />
          </>
        ) : (
          <MeetingRoom
            roomId={roomId}
            currentUser={participantUser || user}
            onLeaveRedirect="/meet"
          />
        )}
      </div>
    </>
  );
}
