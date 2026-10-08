import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  Video,
  Keyboard,
  ShieldCheck,
  Users,
  ScreenShare,
  Mic,
  Sparkles,
  ArrowRight,
  Radio,
} from "lucide-react";
import { NewMeetingModal } from "@/components/meet/NewMeetingModal";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function MeetLandingPage() {
  const router = useRouter();
  const { user, handlegooglesignin } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [meetingCode, setMeetingCode] = useState("");

  const handleStartNewMeeting = () => {
    setIsModalOpen(true);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in or sign in first to join a meeting");
      handlegooglesignin();
      return;
    }
    let code = meetingCode.trim();
    if (!code) return;

    if (code.includes("/meet/")) {
      const parts = code.split("/meet/");
      code = parts[parts.length - 1];
    }
    code = code.split("?")[0].replace(/\/+$/, "").trim();
    const alphanumericOnly = code.replace(/[^a-zA-Z0-9]/g, "");
    if (alphanumericOnly.length === 10) {
      code = `${alphanumericOnly.slice(0, 3)}-${alphanumericOnly.slice(3, 7)}-${alphanumericOnly.slice(7)}`.toLowerCase();
    }

    router.push(`/meet/${code}`);
  };

  return (
    <>
      <Head>
        <title>YourTube Meet - Real-time Video Calls & Meetings</title>
        <meta
          name="description"
          content="Connect, collaborate, and celebrate securely from anywhere with YourTube video meetings."
        />
      </Head>

      <div className="w-full min-h-[calc(100dvh-56px)] bg-zinc-950 text-white p-4 sm:p-8 md:p-12 flex flex-col justify-center items-center">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-2 sm:py-4">
          {/* Left Column: Heading & Actions */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-600/30 text-red-500 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Video Calling</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              High-quality video meetings. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-rose-400">
                Now for everyone.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed">
              We engineered real-time WebRTC calling into YourTube so you can connect securely,
              share screens, chat, and record meetings directly in your browser.
            </p>

            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full">
              <button
                onClick={handleStartNewMeeting}
                className="w-full sm:w-auto py-3 sm:py-3.5 px-5 sm:px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all duration-200 shadow-xl flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>New Meeting</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <form onSubmit={handleJoin} className="flex items-center gap-2 w-full sm:max-w-xs">
                <div className="relative flex-1">
                  <Keyboard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value)}
                    placeholder="Enter code or link"
                    className="w-full bg-zinc-900 border border-zinc-700/80 focus:border-red-500 focus:outline-none rounded-2xl pl-9 pr-3 py-2.5 sm:py-3 text-sm text-white placeholder-zinc-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!meetingCode.trim()}
                  className="py-2.5 sm:py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                >
                  Join
                </button>
              </form>
            </div>

            <div className="pt-4 sm:pt-6 border-t border-zinc-900 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Encrypted calls</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Group video</span>
              </div>
              <div className="flex items-center gap-2">
                <ScreenShare className="w-4 h-4 text-amber-400" />
                <span>Screen sharing</span>
              </div>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-400" />
                <span>Local recording</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Demo Card */}
          <div className="lg:col-span-5 flex justify-center pt-2 sm:pt-0">
            <div className="relative w-full max-w-xs sm:max-w-sm aspect-[4/5] bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl border border-zinc-800/80 p-4 sm:p-5 shadow-2xl flex flex-col justify-between overflow-hidden group hover:border-zinc-700 transition-colors">
              {/* Decorative glowing background blobs */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

              {/* Top card bar */}
              <div className="relative flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-semibold text-zinc-300">Live Video Session</span>
                </div>
                <span className="text-[10px] font-mono bg-zinc-800/80 px-2 py-0.5 rounded-full text-zinc-400">
                  HD 60FPS
                </span>
              </div>

              {/* Simulated 4-participant video grid mockup */}
              <div className="relative grid grid-cols-2 gap-2 my-auto z-10">
                <div className="aspect-video bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700/60 relative flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-sm">
                    Y
                  </div>
                  <span className="absolute bottom-1 left-1.5 text-[9px] font-medium bg-black/60 px-1 rounded text-white">
                    You
                  </span>
                </div>
                <div className="aspect-video bg-zinc-800 rounded-xl overflow-hidden border border-emerald-500/80 ring-1 ring-emerald-500/50 relative flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-sm">
                    S
                  </div>
                  <span className="absolute bottom-1 left-1.5 text-[9px] font-medium bg-black/60 px-1 rounded text-white">
                    Sarah
                  </span>
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="aspect-video bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700/60 relative flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                    A
                  </div>
                  <span className="absolute bottom-1 left-1.5 text-[9px] font-medium bg-black/60 px-1 rounded text-white">
                    Alex
                  </span>
                </div>
                <div className="aspect-video bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700/60 relative flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center font-bold text-white text-sm">
                    M
                  </div>
                  <span className="absolute bottom-1 left-1.5 text-[9px] font-medium bg-black/60 px-1 rounded text-white">
                    Maya
                  </span>
                </div>
              </div>

              {/* Simulated bottom controls bar in mockup */}
              <div className="relative flex items-center justify-center gap-2 z-10 pt-2 border-t border-zinc-800/80">
                <span className="p-2 rounded-full bg-zinc-800 text-zinc-300">
                  <Mic className="w-3.5 h-3.5" />
                </span>
                <span className="p-2 rounded-full bg-zinc-800 text-zinc-300">
                  <Video className="w-3.5 h-3.5" />
                </span>
                <span className="p-2 rounded-full bg-zinc-800 text-zinc-300">
                  <ScreenShare className="w-3.5 h-3.5" />
                </span>
                <span className="px-3 py-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                  End
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* New Meeting Modal */}
        <NewMeetingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </>
  );
}
