import React, { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  AlertTriangle,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";

export const SignInModal: React.FC = () => {
  const {
    isSignInModalOpen,
    closeSignInModal,
    executeGoogleSignIn,
    authError,
  } = useUser();

  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [currentHostname, setCurrentHostname] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentHostname(window.location.hostname);
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
        toast.error("Popup blocked by browser. Please allow popups to sign in.");
      } else {
        toast.error(err?.message || "Google sign in failed. Please try again.");
      }
    } finally {
      setIsLoadingGoogle(false);
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
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
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
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Domain Notice / Auth Error Warning (Shown ONLY if an auth error occurred) */}
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
                👉 Add <code className="bg-black/50 px-1 py-0.5 rounded text-amber-200">{currentHostname}</code> to <span className="font-semibold">Firebase Console → Authentication → Settings → Authorized domains</span>.
              </p>
            </div>
          )}

          {/* Google Sign In Button */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleClick}
              disabled={isLoadingGoogle}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-3 border border-zinc-200 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>{isLoadingGoogle ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>

            <p className="text-[11px] text-zinc-400 text-center leading-relaxed px-4">
              By continuing, you agree to YourTube&apos;s Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="px-5 py-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Google OAuth 2.0</span>
          </div>
          <button
            onClick={closeSignInModal}
            className="hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
