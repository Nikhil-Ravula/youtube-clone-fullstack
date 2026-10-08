import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  Settings,
  ShieldCheck,
  User,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface PreJoinScreenProps {
  roomId: string;
  meetingTitle: string;
  initialName: string;
  localStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onJoin: (userName: string) => void;
  onOpenSettings: () => void;
  isConnecting: boolean;
  errorMessage: string | null;
}

export const PreJoinScreen: React.FC<PreJoinScreenProps> = ({
  roomId,
  meetingTitle,
  initialName,
  localStream,
  isMuted,
  isCameraOff,
  onToggleMic,
  onToggleCamera,
  onSwitchCamera,
  onJoin,
  onOpenSettings,
  isConnecting,
  errorMessage,
}) => {
  const [name, setName] = useState(initialName || "");
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (initialName && !name) {
      setName(initialName);
    }
  }, [initialName]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Meeting link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name to join");
      return;
    }
    onJoin(name.trim());
  };

  const hasVideo = localStream && localStream.getVideoTracks().length > 0 && !isCameraOff;

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white flex flex-col items-center justify-center p-3 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center py-2">
        {/* Left / Top: Live Camera & Audio Preview Tile */}
        <div className="lg:col-span-7 flex flex-col items-center w-full">
          <div className="relative w-full aspect-video bg-zinc-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center group">
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && localStream && el.srcObject !== localStream) {
                  el.srcObject = localStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted // Always muted in preview
              className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-200 ${
                hasVideo ? "opacity-100 block" : "opacity-0 hidden"
              }`}
            />
            {!hasVideo && (
              <div className="flex flex-col items-center text-center p-4 sm:p-6 select-none">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-2xl mb-2 sm:mb-3 border-2 border-zinc-700">
                  {name ? name.charAt(0).toUpperCase() : "U"}
                </div>
                <p className="text-xs sm:text-sm font-medium text-zinc-300">Camera is off</p>
              </div>
            )}

            {/* Quick Preview Media Controls Bar */}
            <div className="absolute bottom-3 sm:bottom-4 inset-x-0 flex items-center justify-center gap-2 sm:gap-3 z-10">
              <button
                type="button"
                onClick={onToggleMic}
                className={`p-2.5 sm:p-3.5 rounded-full backdrop-blur-md transition-all shadow-lg ${
                  isMuted ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-black/60 hover:bg-black/80 text-white"
                }`}
                title={isMuted ? "Unmute mic" : "Mute mic"}
              >
                {isMuted ? <MicOff className="w-4 h-4 sm:w-5 h-5" /> : <Mic className="w-4 h-4 sm:w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={onToggleCamera}
                className={`p-2.5 sm:p-3.5 rounded-full backdrop-blur-md transition-all shadow-lg ${
                  isCameraOff ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-black/60 hover:bg-black/80 text-white"
                }`}
                title={isCameraOff ? "Turn camera on" : "Turn camera off"}
              >
                {isCameraOff ? <VideoOff className="w-4 h-4 sm:w-5 h-5" /> : <Video className="w-4 h-4 sm:w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={onSwitchCamera}
                className="p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-lg"
                title="Switch camera"
              >
                <SwitchCamera className="w-4 h-4 sm:w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-lg"
                title="Audio & Video settings"
              >
                <Settings className="w-4 h-4 sm:w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Audio / Mic Warning or Indicator */}
          <div className="mt-2.5 sm:mt-3 flex items-center gap-2 text-xs text-zinc-400">
            <span className={`w-2 h-2 rounded-full ${isMuted ? "bg-rose-500" : "bg-emerald-500"}`} />
            <span>{isMuted ? "Microphone is muted" : "Microphone ready"}</span>
          </div>
        </div>

        {/* Right / Bottom: Meeting Info & Join Action */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/10 border border-red-600/30 text-red-500 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>YourTube Secure Meet</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {meetingTitle || "Ready to join?"}
            </h1>
            <p className="text-xs text-zinc-400">
              No one else is in the call yet (or waiting for you)
            </p>
          </div>

          {/* Room ID Badge & Copy */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl">
            <div>
              <span className="text-[11px] text-zinc-500 block uppercase font-mono tracking-wider">Room Code</span>
              <span className="text-sm font-mono font-semibold text-zinc-200">{roomId}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Copy link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/50 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Name Form & Join Button */}
          <form onSubmit={handleJoinClick} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Your Display Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="w-full bg-zinc-900 border border-zinc-700/80 focus:border-red-500 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 transition-colors shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isConnecting || !name.trim()}
              className="w-full py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all duration-200 shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              <span>{isConnecting ? "Connecting to call..." : "Join Now"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
