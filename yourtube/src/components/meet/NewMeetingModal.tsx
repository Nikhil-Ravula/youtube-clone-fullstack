import React, { useState } from "react";
import {
  Video,
  Plus,
  Link as LinkIcon,
  Keyboard,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/router";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewMeetingModal: React.FC<NewMeetingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const { user, handlegooglesignin } = useUser();
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [meetingTitleInput, setMeetingTitleInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"menu" | "schedule" | "join">("menu");

  const handleStartInstantMeeting = async () => {
    if (!user) {
      toast.error("Please log in or sign in first to create a meeting");
      handlegooglesignin();
      return;
    }

    try {
      setIsCreating(true);
      const res = await axiosInstance.post("/meeting/create", {
        hostId: user._id || user.id,
        hostName: user.name || user.channelname || "Host",
        title: meetingTitleInput.trim() || `${user.name || "Host"}'s Video Call`,
      });

      const { roomId } = res.data;
      onClose();
      router.push(`/meet/${roomId}`);
    } catch (err: any) {
      console.error("Error creating meeting:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to create meeting. Please check your connection and try again."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateForLater = async () => {
    if (!user) {
      toast.error("Please log in or sign in first to create a meeting");
      handlegooglesignin();
      return;
    }

    try {
      setIsCreating(true);
      const res = await axiosInstance.post("/meeting/create", {
        hostId: user._id || user.id,
        hostName: user.name || user.channelname || "Host",
        title: meetingTitleInput.trim() || "YourTube Meeting",
      });

      setCreatedRoomId(res.data.roomId);
      setMode("schedule");
    } catch (err: any) {
      console.error("Error scheduling meeting:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to generate meeting link. Please try again."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in or sign in first to join a meeting");
      handlegooglesignin();
      return;
    }

    let code = joinCodeInput.trim();
    if (!code) return;

    // Handle full URL pasted (e.g. http://localhost:3000/meet/abc-defg-hij)
    if (code.includes("/meet/")) {
      const parts = code.split("/meet/");
      code = parts[parts.length - 1];
    }
    // Clean query params or trailing slashes
    code = code.split("?")[0].replace(/\/+$/, "");

    onClose();
    router.push(`/meet/${code}`);
  };

  const handleCopyLink = () => {
    if (!createdRoomId) return;
    const link = `${window.location.origin}/meet/${createdRoomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Meeting link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setMode("menu");
    setCreatedRoomId(null);
    setJoinCodeInput("");
    setMeetingTitleInput("");
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleReset();
          onClose();
        }
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl rounded-2xl sm:rounded-3xl mx-auto">
        <DialogHeader className="p-4 sm:p-5 border-b border-zinc-800/80">
          <DialogTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <Video className="w-5 h-5 text-red-600" />
            <span>YourTube Video Meetings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6">
          {mode === "menu" && (
            <div className="space-y-2.5 sm:space-y-3">
              <p className="text-xs text-zinc-400 mb-1 sm:mb-2">
                Connect securely with high quality video and audio calls.
              </p>

              {/* Start Instant Meeting */}
              <button
                onClick={handleStartInstantMeeting}
                disabled={isCreating}
                className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium text-left flex items-center justify-between transition-all duration-200 shadow-lg group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold">Start an instant meeting</h4>
                    <p className="text-[10px] sm:text-[11px] text-white/80">Launch a call and invite participants right now</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Create Meeting for Later */}
              <button
                onClick={handleCreateForLater}
                disabled={isCreating}
                className="w-full p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-200 font-medium text-left flex items-center justify-between transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Create a meeting for later</h4>
                    <p className="text-[11px] text-zinc-400">Get a link that you can share with attendees</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 group-hover:text-zinc-300 transition-all" />
              </button>

              {/* Join with a code */}
              <button
                onClick={() => setMode("join")}
                className="w-full p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-200 font-medium text-left flex items-center justify-between transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Join with a code or link</h4>
                    <p className="text-[11px] text-zinc-400">Enter a meeting code to join an ongoing call</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 group-hover:text-zinc-300 transition-all" />
              </button>
            </div>
          )}

          {/* Mode: Scheduled / Created for later */}
          {mode === "schedule" && createdRoomId && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Here&apos;s your joining info</h3>
                <p className="text-xs text-zinc-400">
                  Send this link to people you want to meet with. Be sure to save it so you can use it later, too.
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl">
                <span className="font-mono text-xs text-zinc-200 truncate pr-2">
                  {typeof window !== "undefined" ? `${window.location.origin}/meet/${createdRoomId}` : createdRoomId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors shrink-0"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => router.push(`/meet/${createdRoomId}`)}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Join Meeting Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Mode: Join by Code */}
          {mode === "join" && (
            <form onSubmit={handleJoinByCode} className="space-y-4 animate-in fade-in">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Enter Room Code or Link</label>
                <div className="relative">
                  <Keyboard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    placeholder="e.g. abc-defg-hij or paste full link"
                    required
                    className="w-full bg-zinc-900 border border-zinc-700/80 focus:border-red-500 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!joinCodeInput.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <span>Join</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
