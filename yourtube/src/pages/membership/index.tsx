import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  Crown,
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Zap,
  Download,
  Clock,
  Calendar,
  AlertCircle,
  RefreshCw,
  FileText,
  ChevronRight,
  Tv,
  Film,
  Award,
  CreditCard,
  Ban,
  CheckCircle2,
  Lock,
  ArrowRight,
  Receipt,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { initiateRazorpayPayment } from "@/lib/razorpay";
import { InvoiceReceiptModal } from "@/components/InvoiceReceiptModal";

// Client-side static definitions matching backend for instant responsive rendering
const PLANS = [
  {
    id: "Free",
    name: "Free Tier",
    badge: "Basic",
    tagline: "Essential streaming & community access",
    icon: Film,
    cardTheme: "border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700",
    headerBadge: "bg-zinc-800/80 text-zinc-400 border-zinc-700/60",
    iconColor: "text-zinc-400",
    buttonBg: "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60",
    accentGlow: "",
    pricing: {
      monthly: { amount: 0, text: "₹0", period: "forever", savings: null },
      quarterly: { amount: 0, text: "₹0", period: "forever", savings: null },
      yearly: { amount: 0, text: "₹0", period: "forever", savings: null },
    },
    features: [
      { text: "Standard streaming (up to 480p SD)", included: true },
      { text: "1 video download per 24 hours", included: true },
      { text: "Standard player with ads", included: true },
      { text: "Single device registration", included: true },
      { text: "30s preview on exclusive content", included: true },
      { text: "HD 720p / 1080p / 4K streaming", included: false },
      { text: "Ad-free uninterrupted viewing", included: false },
      { text: "Offline downloads library", included: false },
      { text: "Exclusive masterclasses & courses", included: false },
      { text: "Priority VIP edge bandwidth", included: false },
    ],
  },
  {
    id: "Bronze",
    name: "Bronze Plus",
    badge: "HD Starter",
    tagline: "720p HD streaming & 5 daily downloads",
    icon: Zap,
    cardTheme: "border-amber-900/40 bg-gradient-to-b from-amber-950/[0.12] via-zinc-900/90 to-zinc-950 text-white hover:border-amber-700/60",
    headerBadge: "bg-amber-950/80 text-amber-300 border-amber-800/60",
    iconColor: "text-amber-500",
    buttonBg: "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20",
    accentGlow: "shadow-amber-900/10",
    pricing: {
      monthly: { amount: 199, text: "₹199", period: "/month", savings: null },
      quarterly: { amount: 499, text: "₹499", period: "/3 months", savings: "Save 16%" },
      yearly: { amount: 1799, text: "₹1,799", period: "/year", savings: "Save 25%" },
    },
    features: [
      { text: "720p High Definition video streaming", included: true },
      { text: "5 video downloads every 24 hours", included: true },
      { text: "Offline downloads with fast queue", included: true },
      { text: "2 simultaneous registered devices", included: true },
      { text: "Extended 3-min preview on premium videos", included: true },
      { text: "Priority customer email support", included: true },
      { text: "100% Ad-Free viewing", included: false },
      { text: "1080p FHD & 4K Ultra HD", included: false },
      { text: "Exclusive masterclasses & courses", included: false },
      { text: "VIP Profile Badge", included: false },
    ],
  },
  {
    id: "Silver",
    name: "Silver Pro",
    badge: "Most Popular",
    tagline: "1080p Full HD, 100% Ad-Free & 15 downloads",
    icon: ShieldCheck,
    isPopular: true,
    cardTheme: "border-red-500/40 ring-1 ring-red-500/20 bg-gradient-to-b from-red-950/[0.15] via-zinc-900/95 to-zinc-950 text-white hover:border-red-500/70 shadow-xl shadow-red-950/20",
    headerBadge: "bg-red-950/90 text-red-300 border-red-700/60",
    iconColor: "text-red-500",
    buttonBg: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25",
    accentGlow: "shadow-red-600/20",
    pricing: {
      monthly: { amount: 499, text: "₹499", period: "/month", savings: null },
      quarterly: { amount: 1299, text: "₹1,299", period: "/3 months", savings: "Save 13%" },
      yearly: { amount: 4499, text: "₹4,499", period: "/year", savings: "Save 25%" },
    },
    features: [
      { text: "1080p Full HD high-bitrate streaming", included: true },
      { text: "15 video downloads every day", included: true },
      { text: "100% Ad-Free uninterrupted viewing", included: true },
      { text: "Offline downloads with 24h grace period", included: true },
      { text: "Unlimited access to all premium videos", included: true },
      { text: "High-speed CDN bandwidth allocation", included: true },
      { text: "Up to 4 registered devices", included: true },
      { text: "Priority support under 4h response", included: true },
      { text: "4K 60FPS cinematic streaming", included: false },
      { text: "Exclusive masterclasses & courses", included: false },
    ],
  },
  {
    id: "Gold",
    name: "Gold VIP",
    badge: "Ultimate Experience",
    tagline: "4K UHD 60FPS, all masterclasses & VIP perks",
    icon: Crown,
    isUltimate: true,
    cardTheme: "border-amber-400/60 ring-1 ring-amber-400/30 bg-gradient-to-b from-amber-500/[0.08] via-zinc-900/95 to-zinc-950 text-white hover:border-amber-400 shadow-2xl shadow-amber-500/10",
    headerBadge: "bg-amber-400/20 text-amber-200 border-amber-400/40",
    iconColor: "text-amber-400",
    buttonBg: "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-extrabold shadow-lg shadow-amber-500/25",
    accentGlow: "shadow-amber-500/20",
    pricing: {
      monthly: { amount: 999, text: "₹999", period: "/month", savings: null },
      quarterly: { amount: 2499, text: "₹2,499", period: "/3 months", savings: "Save 17%" },
      yearly: { amount: 8999, text: "₹8,999", period: "/year", savings: "Save 25%" },
    },
    features: [
      { text: "4K Ultra HD & 60 FPS cinematic streaming", included: true },
      { text: "50 video downloads daily (unlimited)", included: true },
      { text: "Completely Ad-Free on all devices", included: true },
      { text: "Exclusive Masterclasses & Premium Courses", included: true },
      { text: "VIP Profile Badge & Early Content Access", included: true },
      { text: "Fastest dedicated edge CDN streaming", included: true },
      { text: "Up to 10 simultaneous devices", included: true },
      { text: "24/7 dedicated VIP phone & email support", included: true },
      { text: "Offline downloads library", included: true },
      { text: "Unlimited access to all platform content", included: true },
    ],
  },
];

export default function MembershipDashboard() {
  const { user, refreshUser, handlegooglesignin } = useUser();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [statusData, setStatusData] = useState<any>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const fetchSubscriptionData = async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        axiosInstance.get(`/membership/status/${user._id}`),
        axiosInstance.get(`/membership/history/${user._id}`),
      ]);

      if (statusRes.data?.success) {
        setStatusData(statusRes.data);
      }
      if (historyRes.data?.success) {
        setBillingHistory(historyRes.data.history || []);
      }
    } catch (err) {
      console.error("Error fetching subscription dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [user?._id]);

  const currentPlan = statusData?.user?.subscriptionPlan || user?.subscriptionPlan || "Free";
  const planExpiresAt = statusData?.user?.planExpiresAt || user?.planExpiresAt;
  const isAutoRenew = statusData?.user?.autoRenew;
  const remainingDays = statusData?.remainingDays || 0;
  const remainingHours = statusData?.remainingHours || 0;

  // Handle plan purchase / upgrade / renewal via Razorpay
  const handleSelectPlan = async (planId: string) => {
    if (!user?._id) {
      toast.info("Please sign in to choose a subscription plan.");
      handlegooglesignin();
      return;
    }

    if (planId === "Free") {
      if (currentPlan === "Free") {
        toast.info("You are already on the Free tier.");
        return;
      }
      // Downgrade to Free
      if (confirm("Are you sure you want to downgrade to the Free plan?")) {
        try {
          setIsProcessing(true);
          const res = await axiosInstance.post("/membership/downgrade", {
            userId: user._id,
            targetPlan: "Free",
          });
          toast.success(res.data.message || "Downgraded to Free plan.");
          await refreshUser();
          await fetchSubscriptionData();
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Failed to downgrade.");
        } finally {
          setIsProcessing(false);
        }
      }
      return;
    }

    // Paid Plan Selection
    setIsProcessing(true);
    try {
      const orderRes = await axiosInstance.post("/membership/create-order", {
        userId: user._id,
        plan: planId,
        billingCycle,
      });

      if (!orderRes.data?.success) {
        toast.error(orderRes.data?.message || "Could not create payment order.");
        setIsProcessing(false);
        return;
      }

      const orderData = orderRes.data;

      // Launch Razorpay Checkout
      setIsProcessing(false);
      await initiateRazorpayPayment({
        orderData,
        userId: user._id,
        onSuccess: async (verifyResult) => {
          setIsProcessing(false);
          await refreshUser();
          await fetchSubscriptionData();
          if (verifyResult?.transaction) {
            setSelectedInvoice(verifyResult.transaction);
            setIsInvoiceOpen(true);
          }
        },
        onFailure: () => {
          setIsProcessing(false);
          fetchSubscriptionData();
        },
        onDismiss: () => {
          setIsProcessing(false);
          fetchSubscriptionData();
        },
      });
    } catch (err: any) {
      console.error("Order creation error:", err);
      toast.error(err.response?.data?.message || "Failed to initialize payment.");
      setIsProcessing(false);
    }
  };

  // Handle cancellation of auto-renewal
  const handleCancelAutoRenew = async () => {
    if (!user?._id) return;
    try {
      setIsProcessing(true);
      const res = await axiosInstance.post("/membership/cancel", {
        userId: user._id,
      });
      toast.success(res.data.message || "Auto-renewal cancelled successfully.");
      setIsCancelConfirmOpen(false);
      await refreshUser();
      await fetchSubscriptionData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel renewal.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <Head>
        <title>Membership & Subscription Plans - YourTube</title>
        <meta
          name="description"
          content="Choose from Free, Bronze, Silver, and Gold membership plans. Enjoy 4K UHD streaming, offline downloads, 100% ad-free video, and exclusive creator masterclasses."
        />
      </Head>

      <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 selection:bg-red-600 selection:text-white">
        {/* Cinematic Hero Header */}
        <div className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-zinc-800/80">
          {/* Ambient Lighting & Atmosphere */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[350px] bg-red-600/15 blur-[130px] rounded-full pointer-events-none" />
          <div className="absolute top-10 right-1/4 w-[300px] h-[250px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

          <div className="relative max-w-5xl mx-auto text-center space-y-5">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700/60 backdrop-blur-md shadow-inner text-xs font-semibold text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              <span className="tracking-wide uppercase text-[11px] font-bold text-zinc-200">
                YourTube Premium Passes
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              Entertainment,{" "}
              <span className="bg-gradient-to-r from-red-500 via-rose-400 to-amber-400 bg-clip-text text-transparent">
                Elevated to Perfection.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-400 leading-relaxed font-normal">
              Stream uninterrupted in 4K UHD, download unlimited videos for offline travel, and
              learn directly from world-class creator masterclasses.
            </p>

            {/* Value Proposition Pills */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-zinc-300">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xs">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> 100% Ad-Free
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xs">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Up to 4K 60FPS
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xs">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Offline Video Library
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xs">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Masterclasses & Courses
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xs">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Multi-Device Sync
              </span>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-10 relative z-10">
          {/* Active Membership VIP Digital Pass */}
          {user && (
            <div
              className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-md transition-all duration-300 relative overflow-hidden ${
                currentPlan === "Gold"
                  ? "border-amber-400/50 bg-gradient-to-br from-zinc-900 via-amber-950/20 to-zinc-950 shadow-2xl shadow-amber-500/10"
                  : currentPlan === "Silver"
                  ? "border-slate-400/40 bg-gradient-to-br from-zinc-900 via-slate-900/60 to-zinc-950 shadow-xl shadow-slate-500/10"
                  : currentPlan === "Bronze"
                  ? "border-amber-700/40 bg-gradient-to-br from-zinc-900 via-amber-950/30 to-zinc-950 shadow-xl shadow-amber-900/10"
                  : "border-zinc-800 bg-zinc-900/90 shadow-xl"
              }`}
            >
              {/* Subtle metallic sheen highlight */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-white/[0.04] to-transparent rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
                {/* User & Plan Info */}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                      currentPlan === "Gold"
                        ? "bg-gradient-to-tr from-amber-500 to-yellow-300 text-zinc-950"
                        : currentPlan === "Silver"
                        ? "bg-gradient-to-tr from-slate-400 to-zinc-200 text-zinc-950"
                        : currentPlan === "Bronze"
                        ? "bg-gradient-to-tr from-amber-700 to-amber-500 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {currentPlan === "Gold" ? (
                      <Crown className="w-8 h-8" />
                    ) : currentPlan === "Silver" ? (
                      <ShieldCheck className="w-8 h-8" />
                    ) : currentPlan === "Bronze" ? (
                      <Zap className="w-8 h-8" />
                    ) : (
                      <Film className="w-8 h-8" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Active Membership Pass
                      </span>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                          currentPlan === "Gold"
                            ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                            : currentPlan === "Silver"
                            ? "bg-slate-400/20 text-slate-200 border-slate-400/40"
                            : currentPlan === "Bronze"
                            ? "bg-amber-600/20 text-amber-300 border-amber-600/40"
                            : "bg-zinc-800 text-zinc-300 border-zinc-700"
                        }`}
                      >
                        {currentPlan} Tier
                      </span>
                      {currentPlan !== "Free" && (
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                      {statusData?.planConfig?.name || `${currentPlan} Membership`}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {statusData?.planConfig?.tagline || "Essential video streaming & platform features"}
                    </p>
                  </div>
                </div>

                {/* Status Stats Badges */}
                {currentPlan !== "Free" && (
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800/90 shadow-inner">
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Remaining Validity
                      </span>
                      <p className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-red-500" />
                        {remainingDays > 0
                          ? `${remainingDays}d ${remainingHours}h remaining`
                          : "Expiring today"}
                      </p>
                    </div>

                    <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

                    <div>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Renewal Date
                      </span>
                      <p className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {formatDate(planExpiresAt)}
                      </p>
                    </div>

                    <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

                    <div>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Auto-Renewal
                      </span>
                      <p className="text-sm font-semibold mt-0.5">
                        {isAutoRenew ? (
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Ends at cycle
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions for Active Plan */}
              <div className="mt-4 pt-1 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Continuous Service Protection: If your plan expires, your account transitions to
                    Free with all your channel uploads, playlists, and history preserved.
                  </span>
                </div>

                <div className="flex items-center gap-2.5 ml-auto">
                  {currentPlan !== "Free" && isAutoRenew && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCancelConfirmOpen(true)}
                      className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-red-400 border-zinc-700 hover:border-zinc-600 rounded-xl"
                    >
                      <Ban className="w-3.5 h-3.5 mr-1" /> Cancel Renewal
                    </Button>
                  )}
                  {currentPlan !== "Gold" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const target =
                          currentPlan === "Free"
                            ? "Bronze"
                            : currentPlan === "Bronze"
                            ? "Silver"
                            : "Gold";
                        handleSelectPlan(target);
                      }}
                      disabled={isProcessing}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/25 rounded-xl px-4"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-yellow-300" /> Upgrade Plan
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Billing Cycle Switcher Control */}
          <div className="flex flex-col items-center justify-center space-y-3 pt-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
              Choose Billing Frequency
            </span>
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  billingCycle === "monthly"
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("quarterly")}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  billingCycle === "quarterly"
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Quarterly</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Save 15%
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  billingCycle === "yearly"
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Yearly</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Save 25% • 2 Mo Free
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid (The 4 Plans) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrent = currentPlan.toLowerCase() === plan.id.toLowerCase();
              const priceObj = plan.pricing[billingCycle];

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 overflow-hidden ${
                    plan.cardTheme
                  } ${isCurrent ? "ring-2 ring-red-500 shadow-2xl shadow-red-500/15" : ""}`}
                >
                  {/* Popular / Ultimate Ribbon */}
                  {plan.isPopular && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider py-1 px-3 rounded-bl-xl shadow-md">
                      Most Popular
                    </div>
                  )}
                  {plan.isUltimate && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider py-1 px-3 rounded-bl-xl shadow-md">
                      👑 VIP Choice
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="p-6 border-b border-zinc-800/80">
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${plan.headerBadge}`}
                      >
                        {plan.badge}
                      </span>
                      {isCurrent && (
                        <span className="text-xs font-bold text-red-400 bg-red-950/80 px-2.5 py-0.5 rounded-full border border-red-800/80 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active Plan
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-6 h-6 ${plan.iconColor} shrink-0`} />
                      <h3 className="text-2xl font-bold text-white tracking-tight">{plan.name}</h3>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{plan.tagline}</p>

                    {/* Price display */}
                    <div className="mt-5 flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        {priceObj.text}
                      </span>
                      <span className="text-xs font-semibold text-zinc-400">{priceObj.period}</span>
                    </div>

                    {priceObj.savings && (
                      <span className="inline-block mt-2 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                        {priceObj.savings}
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="p-6 flex-1 space-y-3.5">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Included Privileges:
                    </p>
                    <ul className="space-y-3 text-xs text-zinc-300">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          {feat.included ? (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                          )}
                          <span className={feat.included ? "font-medium" : "text-zinc-500 line-through"}>
                            {feat.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Plan CTA Button */}
                  <div className="p-6 pt-0">
                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrent || isProcessing}
                      className={`w-full h-11 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isCurrent
                          ? "bg-zinc-800 text-zinc-500 border border-zinc-700/60 cursor-default"
                          : plan.buttonBg
                      }`}
                    >
                      {isProcessing
                        ? "Opening Checkout..."
                        : isCurrent
                        ? "Current Active Plan"
                        : plan.id === "Free"
                        ? "Switch to Free"
                        : `Upgrade to ${plan.name}`}
                    </Button>
                    <p className="text-[10px] text-zinc-500 text-center mt-2.5 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" /> Encrypted Checkout • Instant Access
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature Comparison Matrix */}
          <div className="bg-zinc-900/90 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden">
            <div className="p-6 sm:p-7 border-b border-zinc-800 bg-zinc-950/60">
              <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-red-500" />
                Comprehensive Plan Features Matrix
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Direct side-by-side comparison of streaming resolution, download allowances, and
                exclusive VIP perks.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-bold">
                    <th className="py-4 px-6">Capability / Feature</th>
                    <th className="py-4 px-4 text-center">Free</th>
                    <th className="py-4 px-4 text-center">Bronze</th>
                    <th className="py-4 px-4 text-center">Silver Pro</th>
                    <th className="py-4 px-4 text-center bg-amber-500/[0.06] text-amber-300 font-extrabold border-l border-r border-amber-500/20">
                      Gold VIP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  <tr className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white">Max Streaming Quality</td>
                    <td className="py-3.5 px-4 text-center text-zinc-400">480p SD</td>
                    <td className="py-3.5 px-4 text-center font-medium text-amber-400">720p HD</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-200">1080p FHD</td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-300 bg-amber-500/[0.06] border-l border-r border-amber-500/20">
                      4K UHD 60FPS
                    </td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white">Daily Video Downloads</td>
                    <td className="py-3.5 px-4 text-center text-zinc-400">1 video / day</td>
                    <td className="py-3.5 px-4 text-center font-medium">5 videos / day</td>
                    <td className="py-3.5 px-4 text-center font-medium">15 videos / day</td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-300 bg-amber-500/[0.06] border-l border-r border-amber-500/20">
                      50 videos / day (Unlimited)
                    </td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white">100% Ad-Free Experience</td>
                    <td className="py-3.5 px-4 text-center text-zinc-600"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-zinc-600"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-emerald-400 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-emerald-400 font-bold bg-amber-500/[0.06] border-l border-r border-amber-500/20"><Check className="w-4 h-4 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white">Offline Downloads Library</td>
                    <td className="py-3.5 px-4 text-center text-zinc-600"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-emerald-400"><Check className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-emerald-400"><Check className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-emerald-400 bg-amber-500/[0.06] border-l border-r border-amber-500/20"><Check className="w-4 h-4 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white">Exclusive Masterclasses & Courses</td>
                    <td className="py-3.5 px-4 text-center text-zinc-600"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-zinc-600"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-zinc-600"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-amber-300 font-bold bg-amber-500/[0.06] border-l border-r border-amber-500/20">
                      Full Access
                    </td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white">Premium Content Preview Limit</td>
                    <td className="py-3.5 px-4 text-center text-zinc-500">30s preview</td>
                    <td className="py-3.5 px-4 text-center text-zinc-400">3 min preview</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-400">Unlimited</td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-300 bg-amber-500/[0.06] border-l border-r border-amber-500/20">
                      Unlimited VIP
                    </td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white">Registered Device Limit</td>
                    <td className="py-3.5 px-4 text-center">1 Device</td>
                    <td className="py-3.5 px-4 text-center">2 Devices</td>
                    <td className="py-3.5 px-4 text-center">4 Devices</td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-300 bg-amber-500/[0.06] border-l border-r border-amber-500/20">
                      10 Devices
                    </td>
                  </tr>
                  <tr className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-white">Customer Support Tier</td>
                    <td className="py-3.5 px-4 text-center text-zinc-500">Community</td>
                    <td className="py-3.5 px-4 text-center">Standard Email</td>
                    <td className="py-3.5 px-4 text-center">Priority &lt;4h</td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-300 bg-amber-500/[0.06] border-l border-r border-amber-500/20">
                      24/7 VIP Phone + Email
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Billing History and Tax Invoices */}
          <div className="bg-zinc-900/90 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden">
            <div className="p-6 sm:p-7 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/60">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-red-500" />
                  Billing History & Invoices
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  View past transactions, download official tax receipts, and track your renewals.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSubscriptionData}
                className="text-xs gap-1.5 self-start sm:self-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>

            {billingHistory.length === 0 ? (
              <div className="py-14 text-center text-zinc-500 space-y-2.5">
                <CreditCard className="w-10 h-10 text-zinc-700 mx-auto" />
                <p className="text-sm font-semibold text-zinc-300">No payment records found yet</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  When you subscribe to Bronze, Silver, or Gold, your verifiable receipts and invoice
                  numbers will be archived here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-bold">
                      <th className="py-3.5 px-6">Date</th>
                      <th className="py-3.5 px-4">Invoice #</th>
                      <th className="py-3.5 px-4">Plan & Cycle</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Payment Status</th>
                      <th className="py-3.5 px-4">Payment ID</th>
                      <th className="py-3.5 px-6 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {billingHistory.map((item) => (
                      <tr key={item._id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-6 font-medium text-white">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-zinc-300">
                          {item.invoiceNumber || "INV-RECEIPT"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-white">{item.subscriptionPlan}</span>{" "}
                          <span className="text-zinc-500 capitalize">({item.billingCycle})</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          ₹{item.amount} {item.currency || "INR"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              item.paymentStatus === "paid"
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/80"
                                : item.paymentStatus === "failed"
                                ? "bg-red-950/80 text-red-400 border border-red-800/80"
                                : item.paymentStatus === "cancelled"
                                ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                : "bg-amber-950/80 text-amber-400 border border-amber-800/80"
                            }`}
                          >
                            {item.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-500 max-w-[130px] truncate" title={item.paymentId}>
                          {item.paymentId || "—"}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(item);
                              setIsInvoiceOpen(true);
                            }}
                            className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg gap-1"
                          >
                            <Receipt className="w-3.5 h-3.5" /> View Receipt
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Trust & Guarantee Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Instant Activation</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your premium benefits, high-speed CDN bandwidth, and download limits are unlocked in real time.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Ban className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Cancel Anytime</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Disable renewal with 1 click anytime. You keep your full benefits until the end of the paid cycle.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Receipt className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Tax-Compliant Invoices</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Detailed GST invoices with itemized tax breakdowns and transaction receipts generated for every payment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Receipt Modal */}
      <InvoiceReceiptModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        invoiceData={selectedInvoice}
      />

      {/* Cancel Auto-Renewal Confirmation Dialog */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800/60 text-amber-400">
                <AlertCircle className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-bold text-white text-lg">Cancel Auto-Renewal?</h3>
                <p className="text-xs text-zinc-400">Your paid privileges remain intact until cycle end.</p>
              </div>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              If you cancel renewal, you will retain all <strong>{currentPlan}</strong> benefits until{" "}
              <strong>{formatDate(planExpiresAt)}</strong>. After that date, your plan will transition
              to Free without losing any of your channel uploads, watch history, or playlists.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelConfirmOpen(false)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
              >
                Keep Renewal
              </Button>
              <Button
                size="sm"
                onClick={handleCancelAutoRenew}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/25"
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
