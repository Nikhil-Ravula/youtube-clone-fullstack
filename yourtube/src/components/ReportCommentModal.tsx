"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Flag, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

export const REPORT_REASONS = [
  {
    id: "spam",
    label: "Spam or commercial content",
    description: "Mass advertisements, repetitive promotions, or bot activity.",
  },
  {
    id: "harassment",
    label: "Harassment or bullying",
    description: "Personal attacks, stalking, intimidation, or targeted insults.",
  },
  {
    id: "offensive",
    label: "Hate speech or offensive content",
    description: "Derogatory slurs, discrimination, violence, or severe profanity.",
  },
  {
    id: "misinformation",
    label: "Misinformation or dangerous content",
    description: "Conspiracy theories, harmful health advice, or fraudulent schemes.",
  },
  {
    id: "malicious_link",
    label: "Malicious links or phishing",
    description: "Suspicious URLs, free crypto scams, or malicious redirects.",
  },
];

interface ReportCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  commentId: string | null;
  commentAuthor?: string;
  commentContent?: string;
  userId?: string;
  onReportSubmitted?: (commentId: string) => void;
}

export const ReportCommentModal: React.FC<ReportCommentModalProps> = ({
  isOpen,
  onClose,
  commentId,
  commentAuthor = "User",
  commentContent = "",
  userId,
  onReportSubmitted,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("spam");
  const [details, setDetails] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !commentId) return null;

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("Please sign in to report a comment.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post(`/comment/report/${commentId}`, {
        reporterId: userId,
        reason: selectedReason,
        details: details.trim(),
      });

      if (res.data?.success) {
        toast.success("Comment flagged for administrator review. Thank you!");
        if (onReportSubmitted) onReportSubmitted(commentId);
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to submit report.";
      toast.error(msg);
      if (err.response?.data?.duplicate) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-500 font-bold">
            <ShieldAlert className="w-5 h-5" />
            <DialogTitle className="text-lg">Report Comment</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Reports are flagged directly for administrator review. Comments are not automatically removed by dislikes.
          </DialogDescription>
        </DialogHeader>

        {/* Comment Preview Snapshot */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs">
          <span className="font-bold text-zinc-700 dark:text-zinc-300">
            @{commentAuthor}:
          </span>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 italic">
            "{commentContent}"
          </p>
        </div>

        {/* Report Reasons Radio List */}
        <div className="space-y-2 py-2">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
            Select a reason:
          </label>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.id}
                className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedReason === r.id
                    ? "border-red-600 bg-red-50/50 dark:bg-red-950/20"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={r.id}
                  checked={selectedReason === r.id}
                  onChange={() => setSelectedReason(r.id)}
                  className="mt-0.5 accent-red-600"
                />
                <div className="text-xs">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                    {r.label}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {r.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Optional details input */}
        <div>
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
            Additional context (optional):
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Provide any additional details for moderators..."
            maxLength={300}
            className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-red-600 resize-none h-16"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
