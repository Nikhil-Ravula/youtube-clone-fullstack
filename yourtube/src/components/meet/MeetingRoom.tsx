import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  ShieldCheck,
  Lock,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Users,
  MessageSquare,
  Radio,
} from "lucide-react";
import { VideoTile } from "./VideoTile";
import { ControlsBar } from "./ControlsBar";
import { ChatSidebar } from "./ChatSidebar";
import { ParticipantsSidebar } from "./ParticipantsSidebar";
import { SettingsModal } from "./SettingsModal";
import { ReactionOverlay } from "./ReactionOverlay";
import { useMeetingRoom, Participant } from "@/lib/webrtc/useMeetingRoom";
import { toast } from "sonner";

interface MeetingRoomProps {
  roomId: string;
  currentUser: any;
  onLeaveRedirect?: string;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  roomId,
  currentUser,
  onLeaveRedirect = "/",
}) => {
  const router = useRouter();

  const {
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

    // Controls State
    isMuted,
    isCameraOff,
    isScreenSharing,
    handRaised,
    isSpeaking,
    facingMode,
    noiseSuppression,
    lowBandwidthMode,
    callDuration,
    isRecording,
    recordingDuration,

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
    leaveMeeting,
    endMeetingForAll,
    isMeetingEnded,
  } = useMeetingRoom(roomId, currentUser);

  // Auto-redirect if host ended meeting or user was removed
  useEffect(() => {
    if (isMeetingEnded) {
      router.push(onLeaveRedirect).catch(() => {
        window.location.href = onLeaveRedirect;
      });
      const t = setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname.includes("/meet/")) {
          window.location.href = onLeaveRedirect;
        }
      }, 500);
      return () => clearTimeout(t);
    }
  }, [isMeetingEnded, router, onLeaveRedirect]);

  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pinnedSocketId, setPinnedSocketId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-pin screen share if local or remote is sharing
  useEffect(() => {
    if (isScreenSharing && selfParticipant) {
      setPinnedSocketId("screen-share-local");
    } else {
      let sharingRemoteId: string | null = null;
      participants.forEach((p) => {
        if (p.isScreenSharing) {
          sharingRemoteId = p.socketId;
        }
      });
      if (sharingRemoteId) {
        setPinnedSocketId(sharingRemoteId);
      } else if (pinnedSocketId === "screen-share-local") {
        setPinnedSocketId(null);
      }
    }
  }, [isScreenSharing, participants, selfParticipant, pinnedSocketId]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Meeting link copied!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => console.log(e));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((e) => console.log(e));
      setIsFullscreen(false);
    }
  };

  const handleLeaveAndRedirect = () => {
    leaveMeeting();
    if (typeof window !== "undefined") {
      router.push(onLeaveRedirect).catch(() => {
        window.location.href = onLeaveRedirect;
      });
    }
  };

  const handleEndAndRedirect = () => {
    endMeetingForAll();
    setTimeout(() => {
      if (typeof window !== "undefined") {
        router.push(onLeaveRedirect).catch(() => {
          window.location.href = onLeaveRedirect;
        });
      }
    }, 250);
  };

  // Compile full participant tiles list
  interface TileItem {
    id: string;
    participant: Participant;
    stream: MediaStream | null;
    isLocal: boolean;
    isScreen?: boolean;
  }

  const tiles: TileItem[] = [];

  // Local user video tile
  const activeSelf: Participant = selfParticipant || {
    socketId: "local-self",
    userId: currentUser?._id || currentUser?.id || "local",
    userName: currentUser?.name || currentUser?.channelname || "You",
    userImage: currentUser?.image || "",
    role: "participant",
    isMuted,
    isCameraOff,
    handRaised,
    isSpeaking,
    quality: "excellent",
  };

  tiles.push({
    id: activeSelf.socketId,
    participant: {
      ...activeSelf,
      isMuted,
      isCameraOff,
      handRaised,
      isSpeaking,
    },
    stream: localStream,
    isLocal: true,
  });

  // Local screen share tile if active
  if (isScreenSharing && screenStream && selfParticipant) {
    tiles.push({
      id: "screen-share-local",
      participant: {
        ...selfParticipant,
        userName: `${selfParticipant.userName} (Screen)`,
        isScreenSharing: true,
        isMuted: true,
        isCameraOff: false,
      },
      stream: screenStream,
      isLocal: true,
      isScreen: true,
    });
  }

  // Remote participants (deduplicated by socketId, distinguishing secondary devices)
  const uniqueRemoteParticipants = new Map<string, Participant>();
  participants.forEach((p) => {
    // Never show current tab self as a remote tile
    if (
      p.socketId === activeSelf.socketId ||
      (selfParticipant && p.socketId === selfParticipant.socketId)
    ) {
      return;
    }
    const isSameUserAsSelf =
      String(p.userId) === String(activeSelf.userId) ||
      (selfParticipant && String(p.userId) === String(selfParticipant.userId));

    const participantData: Participant = isSameUserAsSelf
      ? { ...p, userName: `${p.userName} (Device 2)` }
      : p;

    uniqueRemoteParticipants.set(p.socketId, participantData);
  });

  uniqueRemoteParticipants.forEach((p) => {
    tiles.push({
      id: p.socketId,
      participant: p,
      stream: remoteStreams.get(p.socketId) || null,
      isLocal: false,
    });
  });

  // Calculate dynamic grid classes (mobile-first responsive 2x2 grid for 2-4 participants)
  const getGridClasses = (count: number) => {
    if (count <= 1) return "grid-cols-1 grid-rows-1 max-w-3xl";
    if (count === 2) return "grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1 max-w-5xl";
    if (count <= 4) return "grid-cols-2 grid-rows-2 max-w-5xl";
    if (count <= 6) return "grid-cols-2 grid-rows-3 sm:grid-cols-3 sm:grid-rows-2 max-w-6xl";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-fr max-w-7xl overflow-y-auto";
  };

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Pinned tile
  const pinnedTile = pinnedSocketId ? tiles.find((t) => t.id === pinnedSocketId) : null;
  const unpinnedTiles = pinnedTile ? tiles.filter((t) => t.id !== pinnedSocketId) : tiles;

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] min-h-[100dvh] bg-zinc-950 text-white flex flex-col overflow-hidden select-none">
      {/* Floating Reaction Emojis Animation Layer */}
      <ReactionOverlay reactions={reactions} />

      {/* Top Header Bar */}
      <header className="h-11 sm:h-14 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
            <h2 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate max-w-[100px] sm:max-w-xs md:max-w-md">
              {meetingTitle}
            </h2>
          </div>

          {/* Synchronized Call Elapsed Timer Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-[11px] sm:text-xs shrink-0 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{formatDuration(callDuration)}</span>
          </div>

          {roomSettings.isLocked && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold bg-rose-950/60 border border-rose-700/60 text-rose-300 px-1.5 py-0.5 rounded-full shrink-0">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Room ID and Copy Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors"
            title="Copy meeting link"
          >
            <span className="font-mono text-[10px] sm:text-[11px]">{roomId}</span>
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Area (Video Area + Sidebars) */}
      <div className="flex-1 flex overflow-hidden relative min-h-0 min-w-0">
        {/* Video Canvas Container */}
        <div className="flex-1 w-full h-full min-h-0 min-w-0 flex flex-col p-1.5 sm:p-3 md:p-4 overflow-hidden items-center justify-center">
          {pinnedTile ? (
            /* Spotlight / Pinned Layout */
            <div className="w-full h-full flex flex-col gap-3 min-h-0 min-w-0">
              {/* Main Spotlight Video Tile */}
              <div className="flex-1 w-full min-h-0 relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
                <VideoTile
                  stream={pinnedTile.stream}
                  participant={pinnedTile.participant}
                  isLocal={pinnedTile.isLocal && !pinnedTile.isScreen}
                  isPinned={true}
                  onPin={() => setPinnedSocketId(null)}
                  mirror={pinnedTile.isLocal && !pinnedTile.isScreen && facingMode === "user"}
                  className="w-full h-full"
                />
              </div>

              {/* Bottom Strip of Other Participants */}
              <div className="h-24 sm:h-28 w-full flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none shrink-0">
                {unpinnedTiles.map((tile) => (
                  <div key={tile.id} className="h-full aspect-video shrink-0">
                    <VideoTile
                      stream={tile.stream}
                      participant={tile.participant}
                      isLocal={tile.isLocal && !tile.isScreen}
                      isPinned={false}
                      onPin={() => setPinnedSocketId(tile.id)}
                      mirror={tile.isLocal && !tile.isScreen && facingMode === "user"}
                      className="w-full h-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Equal Grid Layout */
            <div
              className={`w-full h-full min-h-0 min-w-0 grid gap-1.5 sm:gap-2.5 md:gap-3 items-center justify-center ${getGridClasses(
                tiles.length
              )}`}
            >
              {tiles.map((tile) => (
                <VideoTile
                  key={tile.id}
                  stream={tile.stream}
                  participant={tile.participant}
                  isLocal={tile.isLocal && !tile.isScreen}
                  isPinned={false}
                  onPin={() => setPinnedSocketId(tile.id)}
                  mirror={tile.isLocal && !tile.isScreen && facingMode === "user"}
                  className="w-full h-full min-h-0 min-w-0"
                />
              ))}
            </div>
          )}
        </div>

        {/* In-Call Chat Sidebar */}
        <ChatSidebar
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          allowChat={roomSettings.allowChat}
          isHostOrCoHost={isHost || isCoHost}
          currentUserId={selfParticipant?.userId || ""}
        />

        {/* Participants Sidebar */}
        <ParticipantsSidebar
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          selfParticipant={selfParticipant}
          participants={participants}
          roomSettings={roomSettings}
          isHost={isHost}
          isCoHost={isCoHost}
          onMuteParticipant={muteParticipant}
          onMuteAll={muteAll}
          onRemoveParticipant={removeParticipant}
          onToggleLock={toggleRoomLock}
          onSetRole={setParticipantRole}
          onUpdatePermissions={updatePermissions}
        />
      </div>

      {/* Bottom Controls Bar */}
      <ControlsBar
        roomId={roomId}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        handRaised={handRaised}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        callDuration={callDuration}
        unreadChatCount={unreadChatCount}
        participantsCount={tiles.length}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        isHost={isHost}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onSwitchCamera={switchCamera}
        onToggleScreenShare={toggleScreenShare}
        onToggleHandRaise={toggleHandRaise}
        onToggleChat={() => {
          setIsChatOpen(!isChatOpen);
          if (isParticipantsOpen) setIsParticipantsOpen(false);
        }}
        onToggleParticipants={() => {
          setIsParticipantsOpen(!isParticipantsOpen);
          if (isChatOpen) setIsChatOpen(false);
        }}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSendReaction={sendReaction}
        onLeaveCall={handleLeaveAndRedirect}
        onEndCallForAll={handleEndAndRedirect}
        audioDevices={audioInputDevices}
        videoDevices={videoInputDevices}
        selectedAudioId={selectedAudioId}
        selectedVideoId={selectedVideoId}
        onSelectAudioDevice={setAudioDevice}
        onSelectVideoDevice={setVideoDevice}
        noiseSuppression={noiseSuppression}
        onToggleNoiseSuppression={toggleNoiseSuppression}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        audioDevices={audioInputDevices}
        videoDevices={videoInputDevices}
        selectedAudioId={selectedAudioId}
        selectedVideoId={selectedVideoId}
        onSelectAudioDevice={setAudioDevice}
        onSelectVideoDevice={setVideoDevice}
        noiseSuppression={noiseSuppression}
        onToggleNoiseSuppression={toggleNoiseSuppression}
        lowBandwidthMode={lowBandwidthMode}
        onToggleLowBandwidthMode={toggleLowBandwidthMode}
        roomId={roomId}
      />
    </div>
  );
};
