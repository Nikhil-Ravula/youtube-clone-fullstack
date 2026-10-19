import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Printer, Download, CheckCircle, ShieldCheck, Mail, Phone, Building } from "lucide-react";

interface InvoiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: any;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({
  isOpen,
  onClose,
  invoiceData,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoiceData) return null;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const subtotal = Math.round((invoiceData.amount || 0) / 1.18);
  const gst = (invoiceData.amount || 0) - subtotal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 print:max-w-full print:m-0 print:p-0">
        <DialogHeader className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white">
                  Tax Invoice & Payment Receipt
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                  Verified Razorpay Transaction #{invoiceData.invoiceNumber || "INV-000"}
                </DialogDescription>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Paid
            </span>
          </div>
        </DialogHeader>

        {/* Printable Receipt Content */}
        <div ref={printRef} className="space-y-6 py-2 text-sm text-zinc-700 dark:text-zinc-300">
          {/* Company & Client Header */}
          <div className="grid grid-cols-2 gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <h4 className="font-extrabold text-base text-zinc-900 dark:text-white flex items-center gap-1.5">
                <span className="text-red-600 dark:text-red-500">YourTube</span> Subscriptions
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">YourTube Media & Streaming Inc.</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">GSTIN: 27AABCT2026R1ZZ</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Silicon Heights, Tech Boulevard, Bangalore 560100</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500">Billed To</span>
              <p className="font-bold text-zinc-900 dark:text-white">{invoiceData.userName || "Subscriber"}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{invoiceData.userEmail || "user@yourtube.com"}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Payment: Razorpay Test Integration</p>
            </div>
          </div>

          {/* Invoice Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Invoice No</span>
              <p className="font-mono font-bold text-xs text-zinc-900 dark:text-white">{invoiceData.invoiceNumber}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Payment ID</span>
              <p className="font-mono text-xs text-zinc-900 dark:text-white truncate" title={invoiceData.paymentId}>
                {invoiceData.paymentId || "N/A"}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Order ID</span>
              <p className="font-mono text-xs text-zinc-900 dark:text-white truncate" title={invoiceData.orderId}>
                {invoiceData.orderId || "N/A"}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Billing Date</span>
              <p className="text-xs font-medium text-zinc-900 dark:text-white">{formatDate(invoiceData.createdAt)}</p>
            </div>
          </div>

          {/* Membership Item Details */}
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 uppercase">
                  <th className="py-2 font-semibold">Description</th>
                  <th className="py-2 font-semibold text-center">Cycle</th>
                  <th className="py-2 font-semibold text-center">Validity Period</th>
                  <th className="py-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                <tr>
                  <td className="py-3">
                    <p className="font-bold text-zinc-900 dark:text-white">
                      {invoiceData.subscriptionPlan} Membership Plan
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Unlimited streaming, download quotas, HD viewing & exclusive perks
                    </p>
                  </td>
                  <td className="py-3 text-center capitalize">{invoiceData.billingCycle || "Monthly"}</td>
                  <td className="py-3 text-center text-zinc-600 dark:text-zinc-400">
                    {formatDate(invoiceData.subscriptionStartDate).split(",")[0]} —{" "}
                    {formatDate(invoiceData.subscriptionExpiryDate).split(",")[0]}
                  </td>
                  <td className="py-3 text-right font-bold text-zinc-900 dark:text-white">
                    ₹{subtotal.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>GST / Taxes (18% inclusive)</span>
                <span>₹{gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-zinc-900 dark:text-white border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-2">
                <span>Total Paid</span>
                <span className="text-red-600 dark:text-red-500">₹{invoiceData.amount} {invoiceData.currency || "INR"}</span>
              </div>
            </div>
          </div>

          {/* Support and Renewal Notice */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-900 dark:text-amber-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>🔔 Renewal & Cancellation Policy:</span>
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-400">
              {invoiceData.renewalInfo?.renewalPolicy ||
                "Your subscription will automatically renew at the end of the validity period. You can cancel auto-renewal at any time from your subscription dashboard without penalty."}
            </p>
          </div>

          {/* Customer Support Footer */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-red-500" /> support@yourtube.com
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-500" /> +91 800-YOURTUBE
              </span>
            </div>
            <div>24/7 Dedicated Support Assistance</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </Button>
          <Button size="sm" onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
            Close Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
