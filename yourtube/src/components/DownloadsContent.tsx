import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  Download,
  Trash2,
  Play,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Crown,
  Zap,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";
import { getMediaUrl } from "@/lib/mediaUrl";
import { SubscriptionPlanModal } from "./SubscriptionPlanModal";

interface DownloadRecord {
  _id: string;
  userId: string;
  videoId: {
    _id: string;
    videotitle: string;
    filename: string;
    filepath: string;
    filesize: number;
    videochanel: string;
    uploader: string;
  };
  downloadTimestamp: string;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  subscriptionPlan: string;
  fileSize: number;
  formattedSize: string;
  status: "completed" | "in-progress" | "failed";
  deductedQuota: boolean;
  failureReason?: string;
}

export default function DownloadsContent() {
  const { user, openSignInModal, handlegooglesignin } = useUser();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [quotaInfo, setQuotaInfo] = useState<{
    plan: string;
    dailyLimit: number;
    usedToday: number;
    remainingToday: number;
    secondsToReset: number;
    planExpiresAt?: string | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "failed">("all");
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?._id) {
      loadDownloads();
    } else {
      setLoading(false);
    }
  }, [user?._id]);

  const loadDownloads = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/download/user/${user._id}`);
      if (res.data) {
        setDownloads(res.data.downloads || []);
        setQuotaInfo({
          plan: res.data.plan || "Free",
          dailyLimit: res.data.dailyLimit || 1,
          usedToday: res.data.usedToday || 0,
          remainingToday: res.data.remainingToday || 0,
          secondsToReset: res.data.secondsToReset || 0,
          planExpiresAt: res.data.planExpiresAt,
        });
      }
    } catch (error) {
      console.error("Error loading downloads:", error);
      toast.error("Failed to load your downloads history.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!user?._id) return;
    try {
      await axiosInstance.delete(`/download/record/${recordId}?userId=${user._id}`);
      setDownloads((prev) => prev.filter((item) => item._id !== recordId));
      toast.success("Download removed from history.");
    } catch (error) {
      console.error("Error removing download record:", error);
      toast.error("Could not remove record.");
    }
  };

  const handleRedownload = async (record: DownloadRecord) => {
    if (!user?._id || !record.videoId?._id) return;

    setDownloadingId(record._id);
    try {
      // 1. Pre-download authorization with 24h grace period handling
      const authRes = await axiosInstance.post("/download/authorize", {
        userId: user._id,
        videoId: record.videoId._id,
        deviceId: "web-client",
      });

      if (!authRes.data.authorized) {
        toast.error(authRes.data.message || "Download quota exceeded.");
        if (authRes.data.canUpgrade) {
          setIsPlanModalOpen(true);
        }
        return;
      }

      // 2. Trigger direct stream
      const backendBase =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.BACKEND_URL ||
        "http://localhost:5000";
      const cleanBase = backendBase.replace(/\/+$/, "");
      const downloadUrl = `${cleanBase}/download/file/${record.videoId._id}?token=${authRes.data.downloadToken}&userId=${user._id}&deviceId=web-client`;

      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${record.videoId.videotitle || "video"}.mp4`;
      anchor.target = "_blank";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      if (authRes.data.isGracePeriod) {
        toast.success("Re-download started! (Free within 24h grace period - No quota used)");
      } else {
        toast.success(`Download started! Remaining today: ${authRes.data.remainingToday}`);
      }

      // Refresh list & quota
      loadDownloads();
    } catch (err: any) {
      console.error("Redownload error:", err);
      toast.error(err.response?.data?.message || "Failed to download video.");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatResetTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return "midnight (00:00 UTC)";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m (00:00 UTC)`;
  };

  const getDeviceIcon = (device: string) => {
    const d = device.toLowerCase();
    if (d.includes("mobile") || d.includes("phone")) return <Smartphone className="w-3.5 h-3.5 text-gray-500" />;
    if (d.includes("tablet") || d.includes("ipad")) return <Tablet className="w-3.5 h-3.5 text-gray-500" />;
    return <Laptop className="w-3.5 h-3.5 text-gray-500" />;
  };

  const getPlanIcon = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "gold":
        return <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
      case "silver":
        return <ShieldCheck className="w-4 h-4 text-slate-500 fill-slate-200" />;
      case "bronze":
        return <Zap className="w-4 h-4 text-amber-500 fill-amber-200" />;
      default:
        return <Download className="w-4 h-4 text-gray-500" />;
    }
  };

  // Filter and search
  const filteredDownloads = downloads.filter((item) => {
    if (!item.videoId) return false;
    const titleMatch = item.videoId.videotitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const channelMatch = item.videoId.videochanel?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = titleMatch || channelMatch;

    if (!matchesSearch) return false;
    if (statusFilter === "completed") return item.status === "completed";
    if (statusFilter === "failed") return item.status === "failed";
    return true;
  });

  if (!user) {
    return (
      <div className="text-center py-16 px-4 max-w-md mx-auto flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-5 shadow-xs">
          <Download className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Your Downloads</h2>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Sign in to view your downloaded videos, manage your daily quotas, and upgrade your subscription plan.
        </p>
        <Button
          onClick={openSignInModal || handlegooglesignin}
          className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-2.5 font-medium shadow-md"
        >
          Sign in with Google
        </Button>
      </div>
    );
  }

  const quotaPercent = quotaInfo
    ? Math.min(100, Math.round((quotaInfo.usedToday / quotaInfo.dailyLimit) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Subscription Plan & Quota Management */}
      <div className="rounded-2xl border border-gray-200 bg-linear-to-r from-gray-50 via-white to-gray-50 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Plan badge & information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Active Subscription
              </span>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                {getPlanIcon(quotaInfo?.plan || "Free")}
                <span>{quotaInfo?.plan || "Free"} Plan</span>
              </div>
              {quotaInfo?.planExpiresAt && (
                <span className="text-xs text-gray-500">
                  • Expires {format(new Date(quotaInfo.planExpiresAt), "MMM dd, yyyy")}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Controlled Video Downloads
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 max-w-xl">
              Download your favorite videos for offline viewing based on your subscription quota. Re-downloading the same video within 24 hours is free and does not deduct quota.
            </p>
          </div>

          {/* Quota Progress & Upgrade CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            {/* Quota Card */}
            <div className="p-4 rounded-xl bg-white border border-gray-200/90 shadow-2xs min-w-[240px]">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-gray-700">Today's Daily Quota</span>
                <span className="text-red-600">
                  {quotaInfo?.usedToday || 0} / {quotaInfo?.dailyLimit || 1} Used
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    quotaPercent >= 100
                      ? "bg-red-600"
                      : quotaPercent > 60
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span className="font-medium text-emerald-700">
                  {quotaInfo?.remainingToday || 0} download{(quotaInfo?.remainingToday || 0) === 1 ? "" : "s"} left
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Resets in {formatResetTime(quotaInfo?.secondsToReset || 0)}
                </span>
              </div>
            </div>

            {/* Upgrade & Manage Buttons */}
            <div className="flex items-center gap-2">
              <Link href="/membership">
                <Button
                  variant="outline"
                  className="rounded-xl px-4 py-5 font-semibold text-xs sm:text-sm border-gray-300 hover:bg-gray-100 flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              <Button
                onClick={() => setIsPlanModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-5 font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Upgrade Plan</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search downloaded videos by title or channel..."
            className="pl-9 rounded-xl border-gray-200 text-sm h-10"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            className="rounded-xl text-xs h-8 px-3"
          >
            All ({downloads.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "completed" ? "default" : "outline"}
            onClick={() => setStatusFilter("completed")}
            className="rounded-xl text-xs h-8 px-3"
          >
            Completed ({downloads.filter((d) => d.status === "completed").length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "failed" ? "default" : "outline"}
            onClick={() => setStatusFilter("failed")}
            className="rounded-xl text-xs h-8 px-3"
          >
            Failed ({downloads.filter((d) => d.status === "failed").length})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadDownloads}
            title="Refresh downloads list"
            className="rounded-xl h-8 w-8 p-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Downloads List */}
      {loading ? (
        <div className="py-20 text-center text-gray-500 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-600" />
          <p className="text-sm">Loading your offline downloads...</p>
        </div>
      ) : filteredDownloads.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed rounded-2xl bg-gray-50/50">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Download className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            {searchQuery ? "No matching downloads found" : "No videos downloaded yet"}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-5">
            {searchQuery
              ? `No downloaded videos match "${searchQuery}". Try a different keyword.`
              : "When you download videos from the watch page, they will appear here with full playback and file details."}
          </p>
          <Link href="/">
            <Button variant="outline" className="rounded-xl text-xs font-semibold">
              Browse Videos to Download
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDownloads.map((record) => {
            const vid = record.videoId;
            const isRedownloading = downloadingId === record._id;

            return (
              <div
                key={record._id}
                className="rounded-2xl border border-gray-200/90 bg-white p-3.5 sm:p-4 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail and video metadata */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Thumbnail / Video Preview link */}
                  <Link
                    href={`/watch/${vid._id}`}
                    className="relative w-28 sm:w-36 aspect-video bg-black rounded-xl overflow-hidden shrink-0 group block"
                  >
                    <video
                      src={getMediaUrl(vid.filepath)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                      <Play className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                  </Link>

                  {/* Title & Metadata */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <Link
                      href={`/watch/${vid._id}`}
                      className="font-semibold text-sm sm:text-base text-gray-900 hover:text-red-600 line-clamp-1 transition-colors"
                      title={vid.videotitle}
                    >
                      {vid.videotitle}
                    </Link>

                    <p className="text-xs text-gray-600 font-medium">{vid.videochanel || "Channel"}</p>

                    {/* Telemetry & Audit tags */}
                    <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-gray-500">
                      {/* Status */}
                      {record.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : record.status === "failed" ? (
                        <span
                          className="inline-flex items-center gap-1 font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200"
                          title={record.failureReason || "Download failed or connection was closed"}
                        >
                          <AlertCircle className="w-3 h-3" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          <RefreshCw className="w-3 h-3 animate-spin" /> In Progress
                        </span>
                      )}

                      {/* File size */}
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full text-gray-700 font-medium">
                        <HardDrive className="w-3 h-3" />
                        {record.formattedSize || "Video"}
                      </span>

                      {/* Subscription Plan Used */}
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        {getPlanIcon(record.subscriptionPlan)}
                        {record.subscriptionPlan} Plan
                      </span>

                      {/* Quota Deduction Status */}
                      {!record.deductedQuota && (
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                          Free Re-download (Grace Period)
                        </span>
                      )}

                      {/* Date & Time */}
                      <span className="text-gray-400">
                        • {format(new Date(record.downloadTimestamp), "MMM d, yyyy h:mm a")} ({formatDistanceToNow(new Date(record.downloadTimestamp))} ago)
                      </span>
                    </div>

                    {/* Audit Info: Device, Browser, IP */}
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        {getDeviceIcon(record.device)}
                        {record.device} ({record.browser} on {record.os})
                      </span>
                      <span>• IP: {record.ipAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 w-full md:w-auto justify-end">
                  {/* Re-download button */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRedownloading}
                    onClick={() => handleRedownload(record)}
                    className="rounded-xl text-xs flex items-center gap-1.5 h-8 px-3 border-gray-300 hover:bg-gray-100"
                    title="Re-download video file (No quota used if within 24h grace period)"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRedownloading ? "animate-spin" : ""}`} />
                    <span>{isRedownloading ? "Downloading..." : "Re-download"}</span>
                  </Button>

                  {/* Watch Video link */}
                  <Link href={`/watch/${vid._id}`}>
                    <Button
                      size="sm"
                      className="bg-black hover:bg-zinc-800 text-white rounded-xl text-xs h-8 px-3"
                    >
                      Watch
                    </Button>
                  </Link>

                  {/* Remove Record button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteRecord(record._id)}
                    title="Delete from download history"
                    className="h-8 w-8 text-gray-400 hover:text-red-600 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subscription Plan Upgrade Modal */}
      <SubscriptionPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        currentPlan={quotaInfo?.plan || "Free"}
        onPlanUpdated={() => loadDownloads()}
      />
    </div>
  );
}
