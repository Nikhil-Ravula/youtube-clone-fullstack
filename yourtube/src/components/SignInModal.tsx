import React, { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  AlertTriangle,
  User,
  Sparkles,
  LogIn,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";

export const SignInModal: React.FC = () => {
  const {
    isSignInModalOpen,
    closeSignInModal,
    executeGoogleSignIn,
    quickSignIn,
    authError,
    setAuthError,
  } = useUser();

  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingQuick, setIsLoadingQuick] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [currentHostname, setCurrentHostname] = useState("");
  const [isNgrok, setIsNgrok] = useState(false);

  // Custom login state
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      setCurrentHostname(hostname);
      const isRemoteOrNgrok =
        hostname.includes("ngrok") ||
        (hostname !== "localhost" && hostname !== "127.0.0.1");
      setIsNgrok(isRemoteOrNgrok);
    }
  }, []);

  if (!isSignInModalOpen) return null;

  const handleGoogleClick = async () => {
    setIsLoadingGoogle(true);
    try {
      const user = await executeGoogleSignIn();
      if (user) {
        toast.success("Signed in with Google successfully!");
      }
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      if (err?.code === "auth/unauthorized-domain") {
        toast.error("Firebase domain not authorized. Check instructions in modal.");
      } else if (err?.code === "auth/popup-blocked") {
        toast.error("Popup blocked by browser. Please use Quick Sign-In.");
      } else {
        toast.error(err?.message || "Google sign in failed. Please try Quick Sign-In.");
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleQuickProfile = async (
    name: string,
    email: string,
    image: string
  ) => {
    setIsLoadingQuick(true);
    try {
      const user = await quickSignIn({ name, email, image });
      toast.success(`Welcome, ${user.name || name}! Signed in successfully.`);
    } catch (err: any) {
      console.error("Quick sign in failed:", err);
      toast.error("Sign in failed. Please try again.");
    } finally {
      setIsLoadingQuick(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customEmail.trim()) {
      toast.error("Please provide both name and email");
      return;
    }
    setIsLoadingQuick(true);
    try {
      const user = await quickSignIn({
        name: customName.trim(),
        email: customEmail.trim(),
        image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          customName.trim()
        )}`,
      });
      toast.success(`Welcome, ${user.name || customName}! Signed in successfully.`);
    } catch (err: any) {
      console.error("Custom sign in failed:", err);
      toast.error("Sign in failed. Please try again.");
    } finally {
      setIsLoadingQuick(false);
    }
  };

  const copyHostname = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      toast.success(`Copied "${currentHostname}" to clipboard!`);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 text-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Sign in to YourTube
              </h2>
              <p className="text-xs text-zinc-400">
                Unlock video meetings, channels, likes, and more
              </p>
            </div>
          </div>
          <button
            onClick={closeSignInModal}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Domain Notice / Auth Error Warning (Shown ONLY if an actual auth error occurred) */}
          {authError && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-amber-300 block">
                    {authError?.code === "auth/unauthorized-domain"
                      ? "Firebase Unauthorized Domain Error"
                      : "Sign-In Error"}
                  </span>
                  <p className="text-amber-300/90 leading-relaxed">
                    {authError?.message || "An authentication error occurred while signing in with Google."}
                  </p>
                </div>
              </div>

              {currentHostname && (
                <div className="flex items-center justify-between gap-2 p-2.5 bg-black/40 rounded-xl border border-amber-900/50">
                  <div className="truncate font-mono text-[11px] text-zinc-300">
                    Domain: <span className="text-amber-300 font-bold">{currentHostname}</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyHostname}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedDomain ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <p className="text-[11px] text-amber-300/80 leading-normal">
                👉 To use Google OAuth with this link, add{" "}
                <code className="bg-black/50 px-1 py-0.5 rounded text-amber-200">
                  {currentHostname}
                </code>{" "}
                in <span className="font-semibold">Firebase Console → Authentication → Settings → Authorized domains</span>.
                <br />
                ⚡ <strong>Or simply use Instant Quick Sign-In below</strong> with zero setup!
              </p>
            </div>
          )}

          {/* Section 1: Google Sign In */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
              Option 1: Google Account
            </label>
            <button
              onClick={handleGoogleClick}
              disabled={isLoadingGoogle || isLoadingQuick}
              className="w-full py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700/90 text-white font-medium text-sm transition-all duration-150 flex items-center justify-center gap-3 border border-zinc-700/80 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoadingGoogle ? "Signing in..." : "Continue with Google"}</span>
            </button>
          </div>

          {/* Section Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative px-3 bg-zinc-900 text-[11px] font-semibold tracking-wider uppercase text-zinc-400">
              Or Instant 1-Click Sign-In (Recommended)
            </div>
          </div>

          {/* Section 2: 1-Click Quick Sign In */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Works directly on Ngrok and Mobile without Firebase domain setup!</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleQuickProfile(
                    "Alex (Demo User)",
                    "alex.demo@yourtube.com",
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
                  )
                }
                disabled={isLoadingQuick || isLoadingGoogle}
                className="p-3.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-red-500/50 text-left transition-all group cursor-pointer flex items-center gap-3 disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white group-hover:text-red-400 transition-colors truncate">
                    Alex Demo
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    alex.demo@yourtube.com
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickProfile(
                    "Sarah (Tech Creator)",
                    "sarah.creator@yourtube.com",
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                  )
                }
                disabled={isLoadingQuick || isLoadingGoogle}
                className="p-3.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-red-500/50 text-left transition-all group cursor-pointer flex items-center gap-3 disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                  S
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white group-hover:text-red-400 transition-colors truncate">
                    Sarah Creator
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    sarah.creator@yourtube.com
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>

            {/* Custom Account Toggle */}
            <div className="pt-2">
              {!showCustomForm ? (
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
                >
                  Or enter custom name & email
                </button>
              ) : (
                <form
                  onSubmit={handleCustomSubmit}
                  className="space-y-3 p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/60 mt-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">
                      Sign in with Custom Details
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      className="text-[11px] text-zinc-400 hover:text-white"
                    >
                      Hide
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-zinc-400">Your Name</Label>
                      <Input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="e.g. John Doe"
                        required
                        className="bg-zinc-900 border-zinc-700 text-white text-xs h-9 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-400">Your Email</Label>
                      <Input
                        type="email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="e.g. john@example.com"
                        required
                        className="bg-zinc-900 border-zinc-700 text-white text-xs h-9 mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoadingQuick || !customName.trim() || !customEmail.trim()}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-xs h-9 font-semibold"
                  >
                    {isLoadingQuick ? "Signing in..." : "Sign In with Custom Details"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="px-5 py-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Securely persisted via MongoDB</span>
          </div>
          <button
            onClick={closeSignInModal}
            className="hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
