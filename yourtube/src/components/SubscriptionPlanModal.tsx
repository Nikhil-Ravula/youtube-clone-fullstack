import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Check, Crown, Download, ShieldCheck, Sparkles, Zap, ExternalLink } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";
import { initiateRazorpayPayment } from "@/lib/razorpay";
import Link from "next/link";

interface SubscriptionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  onPlanUpdated?: (newPlan: string) => void;
}

export const PLANS_DATA = [
  {
    id: "Free",
    name: "Free",
    price: "₹0",
    period: "forever",
    limitText: "1 video / day",
    dailyLimit: 1,
    description: "Essential personal downloads and basic video access.",
    icon: Download,
    accentColor: "border-gray-200 bg-gray-50/50 text-gray-900",
    badge: "Basic",
    features: [
      "1 video download per 24 hours",
      "Standard quality downloads (480p)",
      "24h re-download grace period",
      "Basic download history audit",
    ],
  },
  {
    id: "Bronze",
    name: "Bronze",
    price: "₹199",
    period: "/month",
    limitText: "5 videos / day",
    dailyLimit: 5,
    description: "HD 720p downloads for students and active viewers.",
    icon: Zap,
    accentColor: "border-amber-400 bg-amber-50/40 text-amber-900",
    badge: "Popular",
    features: [
      "5 video downloads every day",
      "Fast download priority queue",
      "720p HD streaming support",
      "24h re-download grace period",
      "Multi-device registration (2 devices)",
    ],
  },
  {
    id: "Silver",
    name: "Silver",
    price: "₹499",
    period: "/month",
    limitText: "15 videos / day",
    dailyLimit: 15,
    description: "1080p FHD, 100% Ad-Free for power viewers.",
    icon: ShieldCheck,
    accentColor: "border-slate-400 bg-slate-50 text-slate-900 ring-1 ring-slate-300",
    badge: "Recommended",
    features: [
      "15 video downloads every day",
      "1080p Full HD high-speed streams",
      "100% Ad-Free uninterrupted viewing",
      "High-speed bandwidth priority",
      "Up to 4 registered devices",
    ],
  },
  {
    id: "Gold",
    name: "Gold VIP",
    price: "₹999",
    period: "/month",
    limitText: "50 videos / day (Unlimited)",
    dailyLimit: 50,
    description: "4K Ultra HD & all exclusive premium masterclasses.",
    icon: Crown,
    accentColor: "border-yellow-500 bg-yellow-50/50 text-yellow-950 ring-2 ring-yellow-400 shadow-md",
    badge: "Best Value",
    features: [
      "50 video downloads daily (unlimited)",
      "4K Ultra HD & 60 FPS streaming",
      "Exclusive Masterclasses & Courses",
      "Completely Ad-Free viewing",
      "Priority VIP edge bandwidth",
      "Up to 10 simultaneous devices",
    ],
  },
];

export const SubscriptionPlanModal: React.FC<SubscriptionPlanModalProps> = ({
  isOpen,
  onClose,
  currentPlan = "Free",
  onPlanUpdated,
}) => {
  const { user, refreshUser } = useUser();
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (!user?._id) {
      toast.error("Please sign in to select a subscription plan.");
      return;
    }

    if (planId.toLowerCase() === currentPlan.toLowerCase()) {
      toast.info(`You are currently on the ${planId} plan.`);
      return;
    }

    if (planId === "Free") {
      setUpgradingPlan(planId);
      try {
        const res = await axiosInstance.post("/membership/downgrade", {
          userId: user._id,
          targetPlan: "Free",
        });
        toast.success(res.data.message || "Switched to Free plan.");
        if (refreshUser) await refreshUser();
        if (onPlanUpdated) onPlanUpdated("Free");
        onClose();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to downgrade plan.");
      } finally {
        setUpgradingPlan(null);
      }
      return;
    }

    // Paid Plan via Razorpay
    setUpgradingPlan(planId);
    try {
      const orderRes = await axiosInstance.post("/membership/create-order", {
        userId: user._id,
        plan: planId,
        billingCycle: "monthly",
      });

      if (!orderRes.data?.success) {
        toast.error(orderRes.data?.message || "Could not initialize payment order.");
        setUpgradingPlan(null);
        return;
      }

      const orderData = orderRes.data;
      setUpgradingPlan(null);

      await initiateRazorpayPayment({
        orderData,
        userId: user._id,
        onSuccess: async () => {
          if (refreshUser) await refreshUser();
          if (onPlanUpdated) onPlanUpdated(planId);
          setUpgradingPlan(null);
          onClose();
        },
        onFailure: () => setUpgradingPlan(null),
        onDismiss: () => setUpgradingPlan(null),
      });
    } catch (err: any) {
      console.error("Plan upgrade error:", err);
      toast.error(err.response?.data?.message || "Failed to initialize subscription checkout.");
      setUpgradingPlan(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-left pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-red-100 text-red-600">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                  Choose Your Subscription Plan
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  Unlock HD/4K streaming, offline downloads, ad-free video, and exclusive courses.
                </DialogDescription>
              </div>
            </div>

            <Link
              href="/membership"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors self-start sm:self-auto"
            >
              <span>Full Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </DialogHeader>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {PLANS_DATA.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan.toLowerCase() === plan.id.toLowerCase();
            const isUpgrading = upgradingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-5 border flex flex-col justify-between transition-all duration-200 hover:shadow-lg ${plan.accentColor} ${
                  isCurrent ? "ring-2 ring-red-600 shadow-md" : ""
                }`}
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/80 border text-gray-700 shadow-xs">
                    {plan.badge}
                  </span>
                  {isCurrent && (
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-300">
                      Active
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  </div>

                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-xs text-gray-600">{plan.period}</span>
                  </div>

                  <div className="my-2.5 p-2 rounded-lg bg-white/90 border border-gray-200/80">
                    <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      {plan.limitText}
                    </p>
                  </div>

                  <p className="text-xs text-gray-600 mb-4">{plan.description}</p>

                  {/* Feature list */}
                  <ul className="space-y-2 text-xs text-gray-700 border-t pt-3 mb-5">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent || isUpgrading}
                  className={`w-full text-xs font-semibold rounded-xl py-2 shadow-xs transition-all ${
                    isCurrent
                      ? "bg-gray-200 text-gray-600 cursor-default"
                      : plan.id === "Gold"
                      ? "bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {isUpgrading
                    ? "Connecting..."
                    : isCurrent
                    ? "Current Plan"
                    : `Switch to ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
          <div>
            💡 <span className="font-medium text-gray-700">Fair Use & Grace Period:</span> Re-downloading the same video within 24 hours does not count against your quota.
          </div>
          <Link href="/membership" onClick={onClose} className="text-red-600 font-semibold hover:underline">
            View Invoices & Billing History →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};
