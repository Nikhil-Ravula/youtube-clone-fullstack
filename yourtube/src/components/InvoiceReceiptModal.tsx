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
      <DialogContent className="max-w-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto print:max-w-full print:m-0 print:p-0">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-100 text-red-600">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Tax Invoice & Payment Receipt
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Verified Razorpay Transaction #{invoiceData.invoiceNumber || "INV-000"}
                </DialogDescription>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Paid
            </span>
          </div>
        </DialogHeader>

        {/* Printable Receipt Content */}
        <div ref={printRef} className="space-y-6 py-2 text-sm text-gray-700">
          {/* Company & Client Header */}
          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div>
              <h4 className="font-extrabold text-base text-gray-900 flex items-center gap-1.5">
                <span className="text-red-600">YourTube</span> Subscriptions
              </h4>
              <p className="text-xs text-gray-500 mt-1">YourTube Media & Streaming Inc.</p>
              <p className="text-xs text-gray-500">GSTIN: 27AABCT2026R1ZZ</p>
              <p className="text-xs text-gray-500">Silicon Heights, Tech Boulevard, Bangalore 560100</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase text-gray-400">Billed To</span>
              <p className="font-bold text-gray-900">{invoiceData.userName || "Subscriber"}</p>
              <p className="text-xs text-gray-600">{invoiceData.userEmail || "user@yourtube.com"}</p>
              <p className="text-xs text-gray-500 mt-1">Payment: Razorpay Test Integration</p>
            </div>
          </div>

          {/* Invoice Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border">
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase">Invoice No</span>
              <p className="font-mono font-bold text-xs text-gray-900">{invoiceData.invoiceNumber}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase">Payment ID</span>
              <p className="font-mono text-xs text-gray-900 truncate" title={invoiceData.paymentId}>
                {invoiceData.paymentId || "N/A"}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase">Order ID</span>
              <p className="font-mono text-xs text-gray-900 truncate" title={invoiceData.orderId}>
                {invoiceData.orderId || "N/A"}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase">Billing Date</span>
              <p className="text-xs font-medium text-gray-900">{formatDate(invoiceData.createdAt)}</p>
            </div>
          </div>

          {/* Membership Item Details */}
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-xs text-gray-500 uppercase">
                  <th className="py-2 font-semibold">Description</th>
                  <th className="py-2 font-semibold text-center">Cycle</th>
                  <th className="py-2 font-semibold text-center">Validity Period</th>
                  <th className="py-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                <tr>
                  <td className="py-3">
                    <p className="font-bold text-gray-900">
                      {invoiceData.subscriptionPlan} Membership Plan
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Unlimited streaming, download quotas, HD viewing & exclusive perks
                    </p>
                  </td>
                  <td className="py-3 text-center capitalize">{invoiceData.billingCycle || "Monthly"}</td>
                  <td className="py-3 text-center text-gray-600">
                    {formatDate(invoiceData.subscriptionStartDate).split(",")[0]} —{" "}
                    {formatDate(invoiceData.subscriptionExpiryDate).split(",")[0]}
                  </td>
                  <td className="py-3 text-right font-bold text-gray-900">
                    ₹{subtotal.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end pt-2 border-t">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST / Taxes (18% inclusive)</span>
                <span>₹{gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-gray-900 border-t pt-2 mt-2">
                <span>Total Paid</span>
                <span className="text-red-600">₹{invoiceData.amount} {invoiceData.currency || "INR"}</span>
              </div>
            </div>
          </div>

          {/* Support and Renewal Notice */}
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>🔔 Renewal & Cancellation Policy:</span>
            </p>
            <p className="text-[11px] text-amber-800">
              {invoiceData.renewalInfo?.renewalPolicy ||
                "Your subscription will automatically renew at the end of the validity period. You can cancel auto-renewal at any time from your subscription dashboard without penalty."}
            </p>
          </div>

          {/* Customer Support Footer */}
          <div className="pt-3 border-t text-[11px] text-gray-500 flex flex-wrap justify-between items-center gap-2">
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
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
