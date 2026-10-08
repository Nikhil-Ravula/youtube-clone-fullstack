import React from "react";
import {
  X,
  Mic,
  Video,
  ShieldCheck,
  Wifi,
  Sliders,
  Volume2,
  Lock,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  selectedAudioId: string;
  selectedVideoId: string;
  onSelectAudioDevice: (id: string) => void;
  onSelectVideoDevice: (id: string) => void;
  noiseSuppression: boolean;
  onToggleNoiseSuppression: (enabled: boolean) => void;
  lowBandwidthMode: boolean;
  onToggleLowBandwidthMode: (enabled: boolean) => void;
  roomId: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  audioDevices,
  videoDevices,
  selectedAudioId,
  selectedVideoId,
  onSelectAudioDevice,
  onSelectVideoDevice,
  noiseSuppression,
  onToggleNoiseSuppression,
  lowBandwidthMode,
  onToggleLowBandwidthMode,
  roomId,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl rounded-2xl mx-auto">
        <DialogHeader className="p-4 sm:p-5 border-b border-zinc-800 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <Sliders className="w-5 h-5 text-red-500" />
            <span>Call & Device Settings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Audio Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Audio Input (Microphone)</span>
            </div>
            <select
              value={selectedAudioId}
              onChange={(e) => onSelectAudioDevice(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            >
              {audioDevices.length > 0 ? (
                audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))
              ) : (
                <option value="">Default Microphone</option>
              )}
            </select>

            {/* Noise Suppression Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-zinc-200 block">AI Background Noise Suppression</span>
                <span className="text-[11px] text-zinc-500 block">
                  Filters background typing, ambient hums, and echo
                </span>
              </div>
              <button
                type="button"
                onClick={() => onToggleNoiseSuppression(!noiseSuppression)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  noiseSuppression ? "bg-red-600" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    noiseSuppression ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Video Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Video className="w-4 h-4 text-blue-400" />
              <span>Video Input (Camera)</span>
            </div>
            <select
              value={selectedVideoId}
              onChange={(e) => onSelectVideoDevice(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            >
              {videoDevices.length > 0 ? (
                videoDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))
              ) : (
                <option value="">Default Camera</option>
              )}
            </select>
          </div>

          {/* Network & Low Bandwidth Adaptation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Wifi className="w-4 h-4 text-amber-400" />
              <span>Network & Bandwidth Adaptation</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-zinc-200 block">Low-Bandwidth Mode</span>
                <span className="text-[11px] text-zinc-500 block">
                  Reduces video resolution to 360p to preserve smooth audio on slow connections
                </span>
              </div>
              <button
                type="button"
                onClick={() => onToggleLowBandwidthMode(!lowBandwidthMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  lowBandwidthMode ? "bg-amber-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    lowBandwidthMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Security & Encryption Info */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>End-to-End Encrypted WebRTC</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Your audio, video, and screen share streams are encrypted peer-to-peer using standard DTLS-SRTP
              protocols. No audio or video data is recorded on the server.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/90 pt-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Room ID: {roomId}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
