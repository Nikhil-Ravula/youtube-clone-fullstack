import React, { useState } from "react";
import {
  X,
  Search,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  Shield,
  ShieldAlert,
  MoreVertical,
  UserX,
  VolumeX,
  Lock,
  Unlock,
  Share2,
  MessageSquare,
  Signal,
} from "lucide-react";
import { Participant, RoomSettings } from "@/lib/webrtc/useMeetingRoom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ParticipantsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selfParticipant: Participant | null;
  participants: Map<string, Participant>;
  roomSettings: RoomSettings;
  isHost: boolean;
  isCoHost: boolean;
  onMuteParticipant: (socketId: string, userId: string) => void;
  onMuteAll: () => void;
  onRemoveParticipant: (socketId: string, userId: string) => void;
  onToggleLock: () => void;
  onSetRole: (socketId: string, userId: string, role: "cohost" | "participant") => void;
  onUpdatePermissions: (allowScreenShare: boolean, allowChat: boolean) => void;
}

export const ParticipantsSidebar: React.FC<ParticipantsSidebarProps> = ({
  isOpen,
  onClose,
  selfParticipant,
  participants,
  roomSettings,
  isHost,
  isCoHost,
  onMuteParticipant,
  onMuteAll,
  onRemoveParticipant,
  onToggleLock,
  onSetRole,
  onUpdatePermissions,
}) => {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  // Combine self + remote participants (deduplicated by userId)
  const participantMap = new Map<string, Participant>();
  if (selfParticipant) {
    participantMap.set(String(selfParticipant.userId), selfParticipant);
  }
  participants.forEach((p) => {
    const uId = String(p.userId);
    if (!participantMap.has(uId)) {
      participantMap.set(uId, p);
    }
  });
  const allParticipants: Participant[] = Array.from(participantMap.values());

  const filtered = allParticipants.filter((p) =>
    p.userName.toLowerCase().includes(search.toLowerCase())
  );

  const canModerate = isHost || isCoHost;

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:w-80 lg:w-96 md:z-20 w-full h-full bg-zinc-950 border-l border-zinc-800 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
            <span>Participants</span>
            <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-full font-mono">
              {allParticipants.length}
            </span>
          </h3>
          <p className="text-[11px] text-zinc-400">People in this meeting</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-zinc-900 md:bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          title="Close participants"
        >
          <X className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      </div>

      {/* Host Controls Quick Panel */}
      {canModerate && (
        <div className="p-3 bg-zinc-900/60 border-b border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Host Controls
            </span>
            <button
              onClick={onMuteAll}
              className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1.5"
              title="Mute everyone in the call"
            >
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>Mute All</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {/* Lock Meeting Button */}
            <button
              onClick={onToggleLock}
              className={`p-2 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 transition-colors border ${
                roomSettings.isLocked
                  ? "bg-rose-950/60 border-rose-700/60 text-rose-300"
                  : "bg-zinc-800/60 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800"
              }`}
              title="Lock meeting to prevent new entries"
            >
              {roomSettings.isLocked ? <Lock className="w-4 h-4 text-rose-400" /> : <Unlock className="w-4 h-4 text-zinc-400" />}
              <span className="text-[10px]">{roomSettings.isLocked ? "Locked" : "Lock"}</span>
            </button>

            {/* Allow Screen Share Toggle */}
            <button
              onClick={() =>
                onUpdatePermissions(!roomSettings.allowScreenShare, roomSettings.allowChat)
              }
              className={`p-2 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 transition-colors border ${
                roomSettings.allowScreenShare
                  ? "bg-emerald-950/50 border-emerald-700/60 text-emerald-300"
                  : "bg-zinc-800/60 border-zinc-700/50 text-zinc-400"
              }`}
              title="Allow participants to share screen"
            >
              <Share2 className="w-4 h-4 text-zinc-400" />
              <span className="text-[10px]">
                {roomSettings.allowScreenShare ? "Share: On" : "Share: Off"}
              </span>
            </button>

            {/* Allow Chat Toggle */}
            <button
              onClick={() =>
                onUpdatePermissions(roomSettings.allowScreenShare, !roomSettings.allowChat)
              }
              className={`p-2 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 transition-colors border ${
                roomSettings.allowChat
                  ? "bg-emerald-950/50 border-emerald-700/60 text-emerald-300"
                  : "bg-zinc-800/60 border-zinc-700/50 text-zinc-400"
              }`}
              title="Allow participants to send in-call chat"
            >
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              <span className="text-[10px]">
                {roomSettings.allowChat ? "Chat: On" : "Chat: Off"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="p-3 border-b border-zinc-800/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participants..."
            className="w-full bg-zinc-900 border border-zinc-700/60 focus:border-red-500 focus:outline-none rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500"
          />
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filtered.map((p) => {
          const isMe = selfParticipant && p.socketId === selfParticipant.socketId;

          return (
            <div
              key={p.socketId}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-900 transition-colors group"
            >
              {/* Avatar + Name + Role */}
              <div className="flex items-center gap-2.5 truncate">
                <div className="relative">
                  {p.userImage ? (
                    <img
                      src={p.userImage}
                      alt={p.userName}
                      className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      {p.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {p.isSpeaking && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                  )}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-zinc-200 truncate">
                      {p.userName} {isMe && "(You)"}
                    </span>
                    {p.role === "host" && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Host
                      </span>
                    )}
                    {p.role === "cohost" && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Co-host
                      </span>
                    )}
                  </div>
                  {p.handRaised && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                      <Hand className="w-3 h-3" /> Raised hand
                    </span>
                  )}
                </div>
              </div>

              {/* Status Icons & Moderation Dropdown */}
              <div className="flex items-center gap-1">
                {p.isMuted ? (
                  <span title="Microphone Muted">
                    <MicOff className="w-4 h-4 text-rose-500" />
                  </span>
                ) : (
                  <span title={p.isSpeaking ? "Speaking" : "Microphone Active"}>
                    <Mic
                      className={`w-4 h-4 ${p.isSpeaking ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`}
                    />
                  </span>
                )}

                {p.isCameraOff ? (
                  <span title="Camera Off">
                    <VideoOff className="w-4 h-4 text-zinc-600" />
                  </span>
                ) : (
                  <span title="Camera Active">
                    <Video className="w-4 h-4 text-zinc-400" />
                  </span>
                )}

                {/* Host Moderation Menu (cannot moderate self or host if not host) */}
                {canModerate && !isMe && p.role !== "host" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200 w-44">
                      {/* Mute Participant */}
                      <DropdownMenuItem
                        onClick={() => onMuteParticipant(p.socketId, p.userId)}
                        className="text-xs cursor-pointer flex items-center gap-2"
                      >
                        <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Mute</span>
                      </DropdownMenuItem>

                      {/* Co-Host toggle (Host only) */}
                      {isHost && (
                        <DropdownMenuItem
                          onClick={() =>
                            onSetRole(
                              p.socketId,
                              p.userId,
                              p.role === "cohost" ? "participant" : "cohost"
                            )
                          }
                          className="text-xs cursor-pointer flex items-center gap-2"
                        >
                          <Shield className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{p.role === "cohost" ? "Remove Co-Host" : "Make Co-Host"}</span>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator className="bg-zinc-800" />

                      {/* Remove from meeting */}
                      <DropdownMenuItem
                        onClick={() => onRemoveParticipant(p.socketId, p.userId)}
                        className="text-xs cursor-pointer flex items-center gap-2 text-rose-400 focus:text-rose-400 focus:bg-rose-950/40"
                      >
                        <UserX className="w-3.5 h-3.5 text-rose-500" />
                        <span>Remove from call</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
