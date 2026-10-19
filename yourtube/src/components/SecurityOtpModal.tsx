"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  MapPin,
  Clock,
  RotateCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";

export interface SecurityChallengeData {
  requireOtp: boolean;
  tempToken: string;
  email: string;
  maskedEmail: string;
  anomalies: string[];
  deviceInfo: {
    browser: string;
    browserVersion?: string;
    os: string;
    osVersion?: string;
    deviceType?: string;
    deviceModel?: string;
    ip?: string;
    location?: string;
    city?: string;
    state?: string;
  };
  devOtp?: string;
}

interface SecurityOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeData: SecurityChallengeData | null;
  onVerified: (userData: any) => void;
}

export const SecurityOtpModal: React.FC<SecurityOtpModalProps> = ({
  isOpen,
  onClose,
  challengeData,
  onVerified,
}) => {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [trustDevice, setTrustDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset inputs when challengeData changes
  useEffect(() => {
    if (isOpen) {
      setDigits(["", "", "", "", "", ""]);
      setErrorMessage(null);
      setResendCooldown(60);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isOpen, challengeData?.tempToken]);

  // Resend cooldown timer
  useEffect(() => {
    if (!isOpen || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, resendCooldown]);

  if (!isOpen || !challengeData) return null;

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric characters
    const cleanVal = value.replace(/[^0-9]/g, "");

    // Handle paste event of full OTP
    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 6).split("");
      const newDigits = [...digits];
      pasted.forEach((ch, i) => {
        if (i < 6) newDigits[i] = ch;
      });
      setDigits(newDigits);
      const nextFocus = Math.min(5, pasted.length);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);
    setErrorMessage(null);

    // Auto-advance cursor
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullOtp = digits.join("");

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (fullOtp.length !== 6) {
      setErrorMessage("Please enter all 6 digits of your verification code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await axiosInstance.post("/user/verify-otp", {
        tempToken: challengeData.tempToken,
        otp: fullOtp,
        trustDevice,
        trustDurationDays: 30,
      });

      if (response.data?.success && response.data?.result) {
        toast.success("Security verification successful! Welcome back.");
        onVerified(response.data.result);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "Invalid verification code. Please check and try again.";
      setErrorMessage(msg);
      toast.error(msg);
      // Clear digits on error
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const res = await axiosInstance.post("/user/resend-otp", {
        tempToken: challengeData.tempToken,
      });
      toast.success(res.data?.message || "New verification code sent!");
      setResendCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      if (res.data?.devOtp) {
        challengeData.devOtp = res.data.devOtp;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  const handleFillDevOtp = () => {
    if (challengeData.devOtp && challengeData.devOtp.length === 6) {
      setDigits(challengeData.devOtp.split(""));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
            title="Cancel verification"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg animate-pulse">
            <ShieldAlert className="w-9 h-9 text-white" />
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            Account Security Check
          </h3>
          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-sm mx-auto">
            We detected a new browser, device, or location. A 6-digit verification code was sent to:
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-xs font-mono font-bold">
            <Lock className="w-3.5 h-3.5 text-yellow-300" />
            <span>{challengeData.maskedEmail || challengeData.email}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Anomaly Notice Box */}
          {challengeData.anomalies && challengeData.anomalies.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Trigger Reason(s):</span>
              </div>
              <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300 pl-6 list-disc">
                {challengeData.anomalies.map((anomaly, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {anomaly}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detected Device Telemetry Card */}
          <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 truncate">
              {challengeData.deviceInfo?.deviceType === "Mobile" ? (
                <Smartphone className="w-4 h-4 text-zinc-500 shrink-0" />
              ) : (
                <Laptop className="w-4 h-4 text-zinc-500 shrink-0" />
              )}
              <span className="truncate">
                {challengeData.deviceInfo?.browser} ({challengeData.deviceInfo?.os})
              </span>
            </div>

            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 truncate">
              <Globe className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="truncate font-mono">
                {challengeData.deviceInfo?.ip || "127.0.0.1"}
              </span>
            </div>

            <div className="col-span-2 flex items-center gap-2 text-zinc-600 dark:text-zinc-400 truncate pt-1 border-t border-zinc-200 dark:border-zinc-700">
              <MapPin className="w-4 h-4 text-red-500 shrink-0" />
              <span className="truncate">
                {challengeData.deviceInfo?.location ||
                  `${challengeData.deviceInfo?.city || "Hyderabad"}, ${challengeData.deviceInfo?.state || "Telangana"}`}
              </span>
            </div>
          </div>

          {/* Dev Mode OTP Fast-Fill Badge */}
          {challengeData.devOtp && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs">
              <span className="text-blue-800 dark:text-blue-300 font-semibold">
                Dev OTP: <code className="font-bold">{challengeData.devOtp}</code>
              </span>
              <button
                type="button"
                onClick={handleFillDevOtp}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Auto-fill
              </button>
            </div>
          )}

          {/* 6-Digit OTP Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-center text-zinc-700 dark:text-zinc-300 mb-2.5 uppercase tracking-wider">
                Enter 6-Digit Verification Code
              </label>

              <div className="flex justify-center items-center gap-2 sm:gap-3">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-11 h-13 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-black font-mono rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:border-red-600 dark:focus:border-red-500 focus:outline-none transition-all shadow-inner"
                  />
                ))}
              </div>

              {errorMessage && (
                <p className="text-xs text-red-600 dark:text-red-400 text-center font-semibold mt-2.5">
                  {errorMessage}
                </p>
              )}
            </div>

            {/* Trust this device checkbox */}
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 cursor-pointer">
              <input
                type="checkbox"
                id="trustDeviceCheck"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-red-600 cursor-pointer"
              />
              <label htmlFor="trustDeviceCheck" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer leading-tight">
                <span className="font-bold text-zinc-900 dark:text-white block">
                  Trust this browser for 30 days
                </span>
                Skip verification on future logins from this device.
              </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                type="submit"
                disabled={fullOtp.length !== 6 || isSubmitting}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold shadow-lg shadow-red-600/30 text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin" /> Verifying Code...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Verify & Continue
                  </span>
                )}
              </Button>

              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1 pt-1">
                <span>Code expires in 10 minutes</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={handleResend}
                  className="font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend Code"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
