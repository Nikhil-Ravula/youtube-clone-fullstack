import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  Share2,
  Hand,
  MessageSquare,
  Users,
  PhoneOff,
  CircleDot,
  Settings,
  Copy,
  Check,
  Smile,
  ChevronUp,
  ShieldAlert,
  Radio,
  Crown,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ControlsBarProps {
  roomId: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  isRecording: boolean;
  recordingDuration: number;
  callDuration: number;
  unreadChatCount: number;
  participantsCount: number;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  isHost: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onOpenSettings: () => void;
  onSendReaction: (emoji: string) => void;
  onLeaveCall: () => void;
  onEndCallForAll: () => void;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  selectedAudioId: string;
  selectedVideoId: string;
  onSelectAudioDevice: (id: string) => void;
  onSelectVideoDevice: (id: string) => void;
  noiseSuppression: boolean;
  onToggleNoiseSuppression: (enabled: boolean) => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  roomId,
  isMuted,
  isCameraOff,
  isScreenSharing,
  handRaised,
  isRecording,
  recordingDuration,
  callDuration,
  unreadChatCount,
  participantsCount,
  isChatOpen,
  isParticipantsOpen,
  isHost,
  onToggleMic,
  onToggleCamera,
  onSwitchCamera,
  onToggleScreenShare,
  onToggleHandRaise,
  onToggleChat,
  onToggleParticipants,
  onStartRecording,
  onStopRecording,
  onOpenSettings,
  onSendReaction,
  onLeaveCall,
  onEndCallForAll,
  audioDevices,
  videoDevices,
  selectedAudioId,
  selectedVideoId,
  onSelectAudioDevice,
  onSelectVideoDevice,
  noiseSuppression,
  onToggleNoiseSuppression,
}) => {
  const [copied, setCopied] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // Format seconds into HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopyLink = () => {
    const meetUrl = `${window.location.origin}/meet/${roomId}`;
    navigator.clipboard.writeText(meetUrl);
    setCopied(true);
    toast.success("Meeting link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const reactionsList = ["👍", "❤️", "👏", "😂", "😮", "🎉", "🔥", "✋"];

  return (
    <div className="relative w-full bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 px-1.5 sm:px-4 py-2 sm:py-3 z-30 select-none shrink-0">
      <div className="flex items-center justify-center sm:justify-between gap-1.5 sm:gap-2 max-w-full">
        {/* Left Section (Desktop only: Time, Room ID, Copy Link, Recording indicator) */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] sm:text-xs">{formatTime(callDuration)}</span>
          </div>

          <button
            onClick={handleCopyLink}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors"
            title="Copy meeting link"
          >
            <span className="font-mono text-[11px]">{roomId}</span>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Recording Banner */}
          {isRecording && (
            <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-rose-950/80 border border-rose-600/40 rounded-lg text-rose-300 text-[10px] sm:text-xs font-semibold animate-pulse">
              <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" />
              <span>REC {formatTime(recordingDuration)}</span>
            </div>
          )}
        </div>

        {/* Center Section: Core Media & Meeting Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Microphone Toggle & Device Selector */}
          <div className="flex items-center">
            <button
              onClick={onToggleMic}
              className={`p-2.5 sm:p-3 rounded-full sm:rounded-none sm:rounded-l-full flex items-center justify-center transition-all ${
                isMuted
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              }`}
              title={isMuted ? "Unmute microphone (Ctrl+D)" : "Mute microphone (Ctrl+D)"}
            >
              {isMuted ? <MicOff className="w-4 h-4 sm:w-5 h-5" /> : <Mic className="w-4 h-4 sm:w-5 h-5" />}
            </button>
            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`p-3 pl-1 pr-2 rounded-r-full border-l border-zinc-700/50 transition-all ${
                      isMuted ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    }`}
                    title="Microphone settings"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="w-64 bg-zinc-900 border-zinc-800 text-zinc-200">
                  <div className="px-2 py-1.5 text-xs font-semibold text-zinc-400">Microphones</div>
                  {audioDevices.length > 0 ? (
                    audioDevices.map((d) => (
                      <DropdownMenuItem
                        key={d.deviceId}
                        onClick={() => onSelectAudioDevice(d.deviceId)}
                        className={`text-xs cursor-pointer ${
                          selectedAudioId === d.deviceId ? "text-red-400 font-medium" : ""
                        }`}
                      >
                        {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="px-2 py-1 text-xs text-zinc-500">Default Microphone</div>
                  )}
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem
                    onClick={() => onToggleNoiseSuppression(!noiseSuppression)}
                    className="text-xs cursor-pointer justify-between"
                  >
                    <span>Noise Suppression</span>
                    <span className={noiseSuppression ? "text-emerald-400" : "text-zinc-500"}>
                      {noiseSuppression ? "On" : "Off"}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Camera Toggle & Device Selector */}
          <div className="flex items-center">
            <button
              onClick={onToggleCamera}
              className={`p-2.5 sm:p-3 rounded-full sm:rounded-none sm:rounded-l-full flex items-center justify-center transition-all ${
                isCameraOff
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              }`}
              title={isCameraOff ? "Turn on camera (Ctrl+E)" : "Turn off camera (Ctrl+E)"}
            >
              {isCameraOff ? <VideoOff className="w-4 h-4 sm:w-5 h-5" /> : <Video className="w-4 h-4 sm:w-5 h-5" />}
            </button>
            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`p-3 pl-1 pr-2 rounded-r-full border-l border-zinc-700/50 transition-all ${
                      isCameraOff ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    }`}
                    title="Camera settings"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="w-64 bg-zinc-900 border-zinc-800 text-zinc-200">
                  <div className="px-2 py-1.5 text-xs font-semibold text-zinc-400">Cameras</div>
                  {videoDevices.length > 0 ? (
                    videoDevices.map((d) => (
                      <DropdownMenuItem
                        key={d.deviceId}
                        onClick={() => onSelectVideoDevice(d.deviceId)}
                        className={`text-xs cursor-pointer ${
                          selectedVideoId === d.deviceId ? "text-red-400 font-medium" : ""
                        }`}
                      >
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="px-2 py-1 text-xs text-zinc-500">Default Camera</div>
                  )}
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={onSwitchCamera} className="text-xs cursor-pointer flex items-center gap-2">
                    <SwitchCamera className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Switch Front / Rear Camera</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Switch Camera Button (Mobile direct toggle) */}
          <button
            onClick={onSwitchCamera}
            className="sm:hidden p-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            title="Switch front/rear camera"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {/* Screen Share Button (Desktop only) */}
          <button
            onClick={onToggleScreenShare}
            className={`hidden sm:flex p-2.5 sm:p-3 rounded-full items-center justify-center transition-all ${
              isScreenSharing
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            }`}
            title={isScreenSharing ? "Stop sharing screen" : "Share your screen"}
          >
            <Share2 className="w-4 h-4 sm:w-5 h-5" />
          </button>

          {/* Raise Hand Button */}
          <button
            onClick={onToggleHandRaise}
            className={`p-2.5 sm:p-3 rounded-full flex items-center justify-center transition-all ${
              handRaised
                ? "bg-amber-500 hover:bg-amber-600 text-black shadow-lg"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            }`}
            title={handRaised ? "Lower hand" : "Raise hand"}
          >
            <Hand className="w-4 h-4 sm:w-5 h-5" />
          </button>

          {/* Quick Reactions Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-2.5 sm:p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all"
              title="Send emoji reaction"
            >
              <Smile className="w-4 h-4 sm:w-5 h-5" />
            </button>
            {showReactions && (
              <div className="absolute bottom-12 sm:bottom-14 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl shadow-2xl flex items-center gap-1 z-40 animate-in fade-in zoom-in-95">
                {reactionsList.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onSendReaction(emoji);
                      setShowReactions(false);
                    }}
                    className="hover:scale-125 transition-transform p-1 text-lg sm:text-xl rounded-lg hover:bg-zinc-800"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Record Call Button */}
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`hidden sm:flex p-2.5 sm:p-3 rounded-full items-center justify-center transition-all ${
              isRecording
                ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            }`}
            title={isRecording ? "Stop recording meeting" : "Record meeting"}
          >
            <CircleDot className="w-4 h-4 sm:w-5 h-5" />
          </button>

          {/* Leave / End Call Button */}
          <div className="relative">
            {isHost ? (
              // HOST: Prominent "End" button
              <button
                onClick={() => setShowLeaveDialog(!showLeaveDialog)}
                className="p-2.5 sm:px-4 sm:py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-rose-950/40 cursor-pointer"
                title="End meeting (Host)"
              >
                <PhoneOff className="w-4 h-4 sm:w-5 h-5" />
                <span className="hidden sm:inline text-xs sm:text-sm font-bold">End Call</span>
              </button>
            ) : (
              // ATTENDEES / OTHER PEOPLE: "Leave" button
              <button
                onClick={onLeaveCall}
                className="p-2.5 sm:px-4 sm:py-2.5 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                title="Leave meeting"
              >
                <PhoneOff className="w-4 h-4 sm:w-5 h-5" />
                <span className="hidden sm:inline text-xs sm:text-sm font-semibold">Leave</span>
              </button>
            )}

            {/* Host leave / end dialog: Centered Modal */}
            {isHost && showLeaveDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
                {/* Backdrop click to dismiss */}
                <div
                  className="absolute inset-0"
                  onClick={() => setShowLeaveDialog(false)}
                />
                <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 p-5 rounded-3xl shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2.5 text-rose-500 pb-2 border-b border-zinc-800">
                    <PhoneOff className="w-5 h-5 text-rose-500" />
                    <h3 className="text-sm sm:text-base font-bold text-white">End Video Call</h3>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    You are the meeting host. Choose how you would like to end the call:
                  </p>
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLeaveDialog(false);
                        onEndCallForAll();
                      }}
                      className="w-full text-left p-3 text-xs font-semibold text-rose-200 hover:text-white bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/60 rounded-2xl transition-all flex items-center gap-3 cursor-pointer group shadow-lg"
                    >
                      <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-rose-200 group-hover:text-white text-xs sm:text-sm">
                          End meeting for all
                        </div>
                        <div className="text-[10px] text-rose-400/80 font-normal">
                          Disconnects all participants and returns to home
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLeaveDialog(false);
                        onLeaveCall();
                      }}
                      className="w-full text-left p-3 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 rounded-2xl transition-all flex items-center gap-3 cursor-pointer group"
                    >
                      <LogOut className="w-5 h-5 text-zinc-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-semibold text-zinc-200 group-hover:text-white text-xs sm:text-sm">
                          Leave meeting only
                        </div>
                        <div className="text-[10px] text-zinc-400 font-normal">
                          Only leave yourself; keep call active for others
                        </div>
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLeaveDialog(false)}
                    className="w-full py-2 text-center text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: In-Call Chat, Participants, Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Participants Sidebar Toggle */}
          <button
            onClick={onToggleParticipants}
            className={`relative p-2.5 sm:p-3 rounded-full transition-all ${
              isParticipantsOpen
                ? "bg-red-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            }`}
            title="View participants"
          >
            <Users className="w-4 h-4 sm:w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-zinc-700 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-zinc-900">
              {participantsCount}
            </span>
          </button>

          {/* Chat Sidebar Toggle */}
          <button
            onClick={onToggleChat}
            className={`relative p-2.5 sm:p-3 rounded-full transition-all ${
              isChatOpen
                ? "bg-red-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            }`}
            title="In-call chat"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 h-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-zinc-900 animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            className="hidden md:flex p-2.5 sm:p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all"
            title="Meeting settings"
          >
            <Settings className="w-4 h-4 sm:w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
