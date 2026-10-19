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
    accentBorder: "border-gray-200 hover:border-gray-300",
    headerBg: "bg-gray-50 text-gray-800",
    buttonBg: "bg-gray-100 hover:bg-gray-200 text-gray-800",
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
    badge: "Popular Starter",
    tagline: "HD 720p streaming & 5 daily downloads",
    icon: Zap,
    accentBorder: "border-amber-300 hover:border-amber-400 ring-1 ring-amber-200",
    headerBg: "bg-amber-50 text-amber-900",
    buttonBg: "bg-amber-600 hover:bg-amber-700 text-white",
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
    badge: "Recommended",
    tagline: "1080p Full HD, 100% Ad-Free & 15 downloads",
    icon: ShieldCheck,
    accentBorder: "border-slate-400 hover:border-slate-500 ring-2 ring-slate-300 shadow-md",
    headerBg: "bg-slate-100 text-slate-900",
    buttonBg: "bg-slate-800 hover:bg-slate-900 text-white",
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
    tagline: "4K UHD, all exclusive courses & VIP perks",
    icon: Crown,
    accentBorder: "border-yellow-400 hover:border-yellow-500 ring-2 ring-yellow-400 shadow-xl bg-yellow-50/20",
    headerBg: "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-950",
    buttonBg: "bg-yellow-500 hover:bg-yellow-600 text-black font-bold",
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
        <title>Subscription Management & Membership Plans - YourTube</title>
        <meta
          name="description"
          content="Choose from Free, Bronze, Silver, and Gold membership plans. Enjoy HD/4K streaming, offline downloads, ad-free video, and exclusive courses with secure Razorpay test payment integration."
        />
      </Head>

      <div className="min-h-screen bg-neutral-50/60 pb-16">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-red-600 via-red-700 to-zinc-900 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-red-100">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Premium Membership Management</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Unlock Your Ultimate Video Experience
            </h1>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-red-100/90 font-normal">
              Compare plans, manage active subscriptions, download videos offline in HD/4K, enjoy
              ad-free playback, and access exclusive creator masterclasses.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-6">
          {/* Razorpay Sandbox Status Banner */}
          <div className="bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
              <div>
                <span className="font-bold">Razorpay Test Sandbox Active:</span>{" "}
                <span className="text-blue-700 dark:text-blue-300">
                  Instant simulated 3D-Secure checkout enabled for all plans. No real credit card charges will occur.
                </span>
              </div>
            </div>
            <span className="self-start sm:self-auto text-[11px] font-mono bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-700 font-semibold shrink-0">
              ⚡ Razorpay Demo Mode
            </span>
          </div>

          {/* Active Subscription Status Banner Card */}
          {user && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                    {currentPlan === "Gold" ? (
                      <Crown className="w-8 h-8 text-yellow-600" />
                    ) : currentPlan === "Silver" ? (
                      <ShieldCheck className="w-8 h-8 text-slate-700" />
                    ) : currentPlan === "Bronze" ? (
                      <Zap className="w-8 h-8 text-amber-600" />
                    ) : (
                      <Film className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-semibold text-gray-500 uppercase">
                        Current Membership
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          currentPlan === "Gold"
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                            : currentPlan === "Silver"
                            ? "bg-slate-200 text-slate-800 border border-slate-300"
                            : currentPlan === "Bronze"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-gray-100 text-gray-700 border border-gray-300"
                        }`}
                      >
                        {currentPlan} Plan
                      </span>
                      {currentPlan !== "Free" && (
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Active
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">
                      {statusData?.planConfig?.name || `${currentPlan} Plan`}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {statusData?.planConfig?.tagline || "Essential video streaming & features"}
                    </p>
                  </div>
                </div>

                {/* Status Badges & Quick Stats */}
                {currentPlan !== "Free" && (
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-neutral-50 p-3.5 rounded-xl border">
                    <div className="text-center sm:text-left">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase">
                        Remaining Validity
                      </span>
                      <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-red-500" />
                        {remainingDays > 0
                          ? `${remainingDays}d ${remainingHours}h remaining`
                          : "Expiring today"}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-gray-200 hidden sm:block" />
                    <div className="text-center sm:text-left">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase">
                        Next Renewal Date
                      </span>
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {formatDate(planExpiresAt)}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-gray-200 hidden sm:block" />
                    <div className="text-center sm:text-left">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase">
                        Auto-Renewal
                      </span>
                      <p className="text-sm font-semibold">
                        {isAutoRenew ? (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                          </span>
                        ) : (
                          <span className="text-amber-700 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Cancelled at cycle end
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons for Active Plan */}
              <div className="mt-4 pt-2 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Fair Use & Auto-Downgrade: If your subscription expires, your account is safely
                    transitioned to Free while all your watch history and videos remain intact.
                  </span>
                </div>

                <div className="flex items-center gap-2.5 ml-auto">
                  {currentPlan !== "Free" && isAutoRenew && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCancelConfirmOpen(true)}
                      className="text-xs text-gray-600 hover:text-red-600 border-gray-300"
                    >
                      <Ban className="w-3.5 h-3.5 mr-1" /> Cancel Renewal
                    </Button>
                  )}
                  {currentPlan !== "Gold" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const target = currentPlan === "Free" ? "Bronze" : currentPlan === "Bronze" ? "Silver" : "Gold";
                        handleSelectPlan(target);
                      }}
                      disabled={isProcessing}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-yellow-300" /> Upgrade Plan
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Billing Cycle Switcher Tabs */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Select Billing Cycle
            </span>
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("quarterly")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  billingCycle === "quarterly"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>Quarterly</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Save 15%
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  billingCycle === "yearly"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>Yearly</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                  Save 25% • 2 Mo Free
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrent = currentPlan.toLowerCase() === plan.id.toLowerCase();
              const priceObj = plan.pricing[billingCycle];

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl bg-white border flex flex-col justify-between transition-all duration-300 hover:shadow-2xl overflow-hidden ${
                    plan.accentBorder
                  } ${isCurrent ? "ring-2 ring-red-600 shadow-lg" : ""}`}
                >
                  {/* Top Badge */}
                  <div className={`p-5 border-b ${plan.headerBg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/90 border shadow-2xs">
                        {plan.badge}
                      </span>
                      {isCurrent && (
                        <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-red-600 shrink-0" />
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                    </div>
                    <p className="text-xs opacity-80 mt-1 line-clamp-1">{plan.tagline}</p>

                    {/* Price display */}
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                        {priceObj.text}
                      </span>
                      <span className="text-xs font-medium opacity-70">{priceObj.period}</span>
                    </div>
                    {priceObj.savings && (
                      <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {priceObj.savings}
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="p-5 flex-1 space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Included Benefits:
                    </p>
                    <ul className="space-y-2.5 text-xs text-gray-700">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          {feat.included ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                          )}
                          <span className={feat.included ? "font-medium" : "text-gray-400 line-through"}>
                            {feat.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Plan CTA Button */}
                  <div className="p-5 pt-0">
                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrent || isProcessing}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all ${
                        isCurrent
                          ? "bg-gray-100 text-gray-500 cursor-default"
                          : plan.buttonBg
                      }`}
                    >
                      {isProcessing
                        ? "Connecting..."
                        : isCurrent
                        ? "Current Plan"
                        : plan.id === "Free"
                        ? "Switch to Free"
                        : `Upgrade to ${plan.name}`}
                    </Button>
                    <p className="text-[10px] text-gray-400 text-center mt-2">
                      Secure Razorpay Test Payment • Cancel Anytime
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Side-by-Side Detailed Feature Comparison Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b bg-gray-50/60">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                Comprehensive Plan Features Comparison
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Detailed side-by-side feature matrix to help you pick the right plan.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-6">Feature / Capability</th>
                    <th className="py-3 px-4 text-center">Free</th>
                    <th className="py-3 px-4 text-center">Bronze</th>
                    <th className="py-3 px-4 text-center">Silver</th>
                    <th className="py-3 px-4 text-center bg-yellow-50 text-yellow-900">Gold VIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-gray-900">Max Streaming Quality</td>
                    <td className="py-3.5 px-4 text-center text-gray-600">480p SD</td>
                    <td className="py-3.5 px-4 text-center font-medium text-amber-700">720p HD</td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-800">1080p Full HD</td>
                    <td className="py-3.5 px-4 text-center font-bold text-yellow-800 bg-yellow-50/50">
                      4K Ultra HD & 60 FPS
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-gray-900">Daily Video Downloads</td>
                    <td className="py-3.5 px-4 text-center">1 download / day</td>
                    <td className="py-3.5 px-4 text-center font-medium">5 downloads / day</td>
                    <td className="py-3.5 px-4 text-center font-medium">15 downloads / day</td>
                    <td className="py-3.5 px-4 text-center font-bold text-yellow-800 bg-yellow-50/50">
                      50 downloads / day (Unlimited)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-gray-900">Ad-Free Viewing Experience</td>
                    <td className="py-3.5 px-4 text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold bg-yellow-50/50"><Check className="w-4 h-4 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-gray-900">Offline Downloads Library</td>
                    <td className="py-3.5 px-4 text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 bg-yellow-50/50"><Check className="w-4 h-4 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-gray-900">Exclusive Masterclasses & Courses</td>
                    <td className="py-3.5 px-4 text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-gray-400"><X className="w-4 h-4 mx-auto" /></td>
                    <td className="py-3.5 px-4 text-center text-yellow-700 font-bold bg-yellow-50/50">
                      Full Access Included
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-gray-900">Premium Video Access Limit</td>
                    <td className="py-3.5 px-4 text-center text-gray-500">30s preview</td>
                    <td className="py-3.5 px-4 text-center text-gray-600">3 min preview</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">Unlimited</td>
                    <td className="py-3.5 px-4 text-center font-bold text-yellow-800 bg-yellow-50/50">Unlimited VIP</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-gray-900">Simultaneous Registered Devices</td>
                    <td className="py-3.5 px-4 text-center">1 Device</td>
                    <td className="py-3.5 px-4 text-center">2 Devices</td>
                    <td className="py-3.5 px-4 text-center">4 Devices</td>
                    <td className="py-3.5 px-4 text-center font-bold text-yellow-800 bg-yellow-50/50">10 Devices</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-gray-900">Customer Support Tier</td>
                    <td className="py-3.5 px-4 text-center">Community Help</td>
                    <td className="py-3.5 px-4 text-center">Standard Email</td>
                    <td className="py-3.5 px-4 text-center">Priority &lt;4h</td>
                    <td className="py-3.5 px-4 text-center font-bold text-yellow-800 bg-yellow-50/50">24/7 VIP Phone + Email</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Billing History and Invoices Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-red-600" />
                  Billing History & Tax Invoices
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  View past Razorpay payment transactions, download receipts, and track renewals.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSubscriptionData}
                className="text-xs gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>

            {billingHistory.length === 0 ? (
              <div className="py-12 text-center text-gray-500 space-y-2">
                <CreditCard className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-gray-700">No transactions recorded yet</p>
                <p className="text-xs text-gray-400">
                  When you purchase a Bronze, Silver, or Gold plan via Razorpay, your invoices will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-6">Date</th>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Plan & Cycle</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4">Payment ID</th>
                      <th className="py-3 px-6 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {billingHistory.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-medium text-gray-900">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-gray-800">
                          {item.invoiceNumber || "INV-TEST"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-gray-900">{item.subscriptionPlan}</span>{" "}
                          <span className="text-gray-400 capitalize">({item.billingCycle})</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          ₹{item.amount} {item.currency || "INR"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              item.paymentStatus === "paid"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : item.paymentStatus === "failed"
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : item.paymentStatus === "cancelled"
                                ? "bg-gray-100 text-gray-700 border border-gray-300"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {item.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-500 max-w-[130px] truncate" title={item.paymentId}>
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
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            View Invoice
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                <AlertCircle className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Cancel Auto-Renewal?</h3>
                <p className="text-xs text-gray-500">Your paid features will not be lost today.</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              If you cancel renewal, you will retain all <strong>{currentPlan}</strong> features until{" "}
              <strong>{formatDate(planExpiresAt)}</strong>. After this date, your plan will smoothly
              transition to Free without losing any of your saved videos, channel uploads, or playlists.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelConfirmOpen(false)}
                className="text-xs"
              >
                Keep Renewal
              </Button>
              <Button
                size="sm"
                onClick={handleCancelAutoRenew}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
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
