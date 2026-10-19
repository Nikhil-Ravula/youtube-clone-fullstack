"use client";

import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  MapPin,
  Clock,
  Sun,
  Moon,
  Sparkles,
  RotateCw,
  Trash2,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  KeyRound,
  History,
  Lock,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import { getOrCreateDeviceId } from "@/lib/deviceFingerprint";
import { getClientISTTimeInfo, ISTTimeInfo } from "@/lib/themeHelper";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface TrustedDevice {
  _id: string;
  deviceId: string;
  deviceName?: string;
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
  deviceModel?: string;
  ip: string;
  city?: string;
  state?: string;
  country?: string;
  location?: string;
  trustedAt: string;
  expiresAt?: string;
  lastActive: string;
}

interface LoginRecord {
  _id: string;
  ip: string;
  browser: string;
  browserVersion?: string;
  os: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
  deviceModel?: string;
  city?: string;
  state?: string;
  country?: string;
  location?: string;
  timestamp: string;
  status: "SUCCESS" | "OTP_REQUIRED" | "OTP_VERIFIED" | "OTP_FAILED" | "REVOKED";
  reason?: string;
  isTrustedDevice?: boolean;
}

export default function SecurityPage() {
  const { user, handlegooglesignin, theme, themePreference, updateTheme } = useUser();
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");

  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [istTime, setIstTime] = useState<ISTTimeInfo>(getClientISTTimeInfo());
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "SUCCESS" | "OTP" | "FAILED">("ALL");

  // Keep IST clock updated every 30 seconds
  useEffect(() => {
    setCurrentDeviceId(getOrCreateDeviceId());
    setIstTime(getClientISTTimeInfo());

    const timer = setInterval(() => {
      setIstTime(getClientISTTimeInfo());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch security overview
  const fetchSecurityData = useCallback(async () => {
    if (!user?._id) return;
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`/user/security/${user._id}`);
      if (res.data?.success) {
        setTrustedDevices(res.data.trustedDevices || []);
        setLoginHistory(res.data.loginHistory || []);
        if (res.data.istInfo) setIstTime(res.data.istInfo);
      }
    } catch (err) {
      console.error("Failed to load security overview:", err);
      toast.error("Could not load security records.");
    } finally {
      setIsLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (user?._id) {
      fetchSecurityData();
    } else {
      setIsLoading(false);
    }
  }, [user?._id, fetchSecurityData]);

  // Handle single device revocation
  const handleRevokeDevice = async (deviceId: string, name: string) => {
    if (!user?._id) return;
    setIsRevoking(deviceId);
    try {
      const res = await axiosInstance.delete(
        `/user/security/${user._id}/trusted-device/${deviceId}`
      );
      if (res.data?.success) {
        toast.success(`Device "${name}" revoked from trusted list.`);
        setTrustedDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
        fetchSecurityData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to revoke device.");
    } finally {
      setIsRevoking(null);
    }
  };

  // Handle revoke all other devices
  const handleRevokeAll = async () => {
    if (!user?._id) return;
    setIsRevokingAll(true);
    try {
      const res = await axiosInstance.post(`/user/security/${user._id}/revoke-all-devices`, {
        currentDeviceId,
      });
      if (res.data?.success) {
        toast.success("All other trusted devices have been revoked.");
        fetchSecurityData();
      }
    } catch (err: any) {
      toast.error("Failed to revoke remote devices.");
    } finally {
      setIsRevokingAll(false);
    }
  };

  const filteredHistory = loginHistory.filter((item) => {
    if (historyFilter === "SUCCESS") return item.status === "SUCCESS" || item.status === "OTP_VERIFIED";
    if (historyFilter === "OTP") return item.status === "OTP_REQUIRED" || item.status === "OTP_VERIFIED";
    if (historyFilter === "FAILED") return item.status === "OTP_FAILED" || item.status === "REVOKED";
    return true;
  });

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mb-4 shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
          Account Security & Devices
        </h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Sign in to review your active sessions, trusted devices, login audit trail, and time-based theme settings.
        </p>
        <Button onClick={handlegooglesignin} className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-6">
          Sign in to Your Account
        </Button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Account Security & Devices - YourTube</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header Hero Banner */}
        <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-zinc-900 via-neutral-900 to-zinc-950 text-white border border-zinc-800 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30 text-white">
                <ShieldCheck className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                    Account Security & Session Control
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Shield Active
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                  Intelligent anomaly detection actively monitors browser, device, IP, and location changes with mandatory OTP verification.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchSecurityData}
              disabled={isLoading}
              className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs gap-1.5 rounded-xl self-end sm:self-auto"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>
          </div>
        </div>

        {/* SECTION 1: TIME-BASED THEME ADAPTATION */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                Time-Based Theme Adaptation (IST)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Automatically adjusts appearance based on Indian Standard Time (UTC+05:30) or keeps your manual preference.
              </p>
            </div>

            {/* Current IST Clock Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>IST {istTime.timeFormatted}</span>
              <span className="text-[10px] text-zinc-500 font-sans font-medium">
                ({istTime.isLightPeriod ? "Morning Window" : "Evening/Night"})
              </span>
            </div>
          </div>

          {/* Theme Mode Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* Auto IST Schedule Card */}
            <div
              onClick={() => updateTheme("auto", "auto")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                themePreference === "auto"
                  ? "border-red-600 bg-red-50/50 dark:bg-red-950/20 shadow-md"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Recommended
                </span>
                {themePreference === "auto" && (
                  <CheckCircle2 className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Automatic (IST Schedule)
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  ☀️ <strong>Light theme</strong> between 5:00 AM – 12:00 PM IST
                  <br />
                  🌙 <strong>Dark theme</strong> for all other time periods.
                </p>
              </div>
            </div>

            {/* Light Theme Card */}
            <div
              onClick={() => updateTheme("light", "light")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                themePreference === "light"
                  ? "border-red-600 bg-red-50/50 dark:bg-red-950/20 shadow-md"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                  <Sun className="w-5 h-5" />
                </span>
                {themePreference === "light" && (
                  <CheckCircle2 className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Always Light Theme
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Clean white aesthetics across all devices, overriding the automated time schedule.
                </p>
              </div>
            </div>

            {/* Dark Theme Card */}
            <div
              onClick={() => updateTheme("dark", "dark")}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                themePreference === "dark"
                  ? "border-red-600 bg-red-50/50 dark:bg-red-950/20 shadow-md"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Moon className="w-5 h-5" />
                </span>
                {themePreference === "dark" && (
                  <CheckCircle2 className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Always Dark Theme
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Deep modern black theme optimized for reduced eye strain and OLED displays.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: TRUSTED DEVICES MANAGEMENT */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                  Trusted Devices ({trustedDevices.length})
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold">
                  30-Day Exemption Active
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                These browsers and devices have passed OTP verification and can log in without repeated prompts.
              </p>
            </div>

            {trustedDevices.length > 1 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevokeAll}
                disabled={isRevokingAll}
                className="text-xs rounded-xl gap-1.5 h-8 font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                {isRevokingAll ? "Revoking..." : "Log Out All Other Devices"}
              </Button>
            )}
          </div>

          {trustedDevices.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
              <Laptop className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
              No trusted devices registered yet. Devices are registered when signing in with the "Trust this device" option.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {trustedDevices.map((device) => {
                const isCurrent = device.deviceId === currentDeviceId;
                const DeviceIcon =
                  device.deviceType === "Mobile"
                    ? Smartphone
                    : device.deviceType === "Tablet"
                    ? Tablet
                    : Laptop;

                return (
                  <div
                    key={device._id || device.deviceId}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isCurrent
                        ? "bg-zinc-50/80 dark:bg-zinc-800/40 border-zinc-300 dark:border-zinc-700 shadow-sm"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                          <DeviceIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                              {device.browser} ({device.os})
                            </h4>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                                This Device
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {device.deviceModel || device.deviceType}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleRevokeDevice(device.deviceId, `${device.browser} on ${device.os}`)
                        }
                        disabled={isRevoking === device.deviceId}
                        className="text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl h-8 w-8"
                        title="Revoke trust"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-zinc-400" />
                          <code>{device.ip || "127.0.0.1"}</code>
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[150px]">
                          <MapPin className="w-3 h-3 text-red-500" />
                          <span className="truncate">{device.location || `${device.city}, ${device.state}`}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-400 pt-0.5">
                        <span>Trusted: {new Date(device.trustedAt).toLocaleDateString()}</span>
                        <span>
                          {device.expiresAt
                            ? `Expires ${formatDistanceToNow(new Date(device.expiresAt), { addSuffix: true })}`
                            : "30-day trust"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3: LOGIN HISTORY & AUDIT LOG */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-red-600" />
                Login History & Security Audit Logs
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Comprehensive record of recent login attempts, anomaly detections, and verification statuses.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs">
              {(["ALL", "SUCCESS", "OTP", "FAILED"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setHistoryFilter(filter)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    historyFilter === filter
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {filter === "ALL"
                    ? "All Events"
                    : filter === "SUCCESS"
                    ? "Successful"
                    : filter === "OTP"
                    ? "OTP Challenges"
                    : "Failed / Revoked"}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
              No audit records matching selected filter.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredHistory.map((item) => {
                const isSuccess = item.status === "SUCCESS" || item.status === "OTP_VERIFIED";
                const isOtpReq = item.status === "OTP_REQUIRED";
                const isFailed = item.status === "OTP_FAILED" || item.status === "REVOKED";

                const formattedTime = new Date(item.timestamp).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <div
                    key={item._id}
                    className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/30 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSuccess
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                            : isOtpReq
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                            : "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : isOtpReq ? (
                          <KeyRound className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {item.browser} on {item.os}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider ${
                              item.status === "SUCCESS"
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                : item.status === "OTP_VERIFIED"
                                ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                : item.status === "OTP_REQUIRED"
                                ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                                : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {item.status.replace("_", " ")}
                          </span>
                        </div>

                        {item.reason && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                            {item.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-zinc-500 dark:text-zinc-400 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{item.ip}</span>
                        <span>•</span>
                        <span className="truncate max-w-[140px]">
                          {item.location || `${item.city || "Hyderabad"}, ${item.state || "Telangana"}`}
                        </span>
                      </div>
                      <span className="text-zinc-400">{formattedTime}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
