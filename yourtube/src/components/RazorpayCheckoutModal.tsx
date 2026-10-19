import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  X,
  Lock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  QrCode,
  Check,
  Info,
  ChevronRight,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

export interface RazorpayCheckoutEventDetail {
  orderData: {
    orderId: string;
    amount: number; // in paise
    amountInInr: number;
    currency: string;
    keyId: string;
    invoiceNumber: string;
    plan: string;
    billingCycle: string;
    user?: {
      name?: string;
      email?: string;
    };
  };
  userId: string;
  onSuccess: (data: any) => void;
  onFailure?: (err: any) => void;
  onDismiss?: () => void;
}

// Global dispatcher to open Razorpay modal
export const openRazorpayModal = (params: RazorpayCheckoutEventDetail) => {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("yourtube-open-razorpay", { detail: params });
    window.dispatchEvent(event);
  }
};

export const isDemoRazorpayKey = (key?: string): boolean => {
  if (!key) return true;
  if (
    key.includes("YourTubeDemo") ||
    key.includes("Demo") ||
    key.includes("demo") ||
    key === "rzp_test_placeholder" ||
    key.length < 18
  ) {
    return true;
  }
  return false;
};

// Preset test cards for fast 1-click autofill
const TEST_CARDS = [
  { name: "Visa Test Card", number: "4111 1111 1111 1111", expiry: "12/28", cvv: "123", brand: "visa" },
  { name: "Mastercard Test", number: "5123 4567 8901 2345", expiry: "10/29", cvv: "456", brand: "mastercard" },
  { name: "RuPay Test Card", number: "6071 2345 6789 0123", expiry: "08/27", cvv: "789", brand: "rupay" },
];

const POPULAR_BANKS = [
  { id: "hdfc", name: "HDFC Bank", code: "HDFC" },
  { id: "icici", name: "ICICI Bank", code: "ICIC" },
  { id: "sbi", name: "State Bank of India", code: "SBIN" },
  { id: "axis", name: "Axis Bank", code: "UTIB" },
  { id: "kotak", name: "Kotak Mahindra", code: "KKBK" },
  { id: "pnb", name: "Punjab National", code: "PUNB" },
];

export const RazorpayCheckoutModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [checkoutParams, setCheckoutParams] = useState<RazorpayCheckoutEventDetail | null>(null);

  // Payment navigation tabs: 'card' | 'upi' | 'netbanking' | 'wallet'
  const [activeTab, setActiveTab] = useState<"card" | "upi" | "netbanking" | "wallet">("card");

  // Form states
  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [cardHolder, setCardHolder] = useState("Subscriber");
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [customUpiId, setCustomUpiId] = useState("");
  const [selectedBank, setSelectedBank] = useState("hdfc");
  const [selectedWallet, setSelectedWallet] = useState("paytm");

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<RazorpayCheckoutEventDetail>;
      if (customEvent.detail) {
        setCheckoutParams(customEvent.detail);
        setCardHolder(customEvent.detail.orderData?.user?.name || "Subscriber");
        setIsOpen(true);
        setActiveTab("card");
        setIsProcessing(false);
        setProcessingStep("");
      }
    };

    window.addEventListener("yourtube-open-razorpay", handleOpen);
    return () => {
      window.removeEventListener("yourtube-open-razorpay", handleOpen);
    };
  }, []);

  if (!checkoutParams) return null;

  const { orderData, userId, onSuccess, onFailure, onDismiss } = checkoutParams;
  const amountInInr = orderData?.amountInInr || (orderData?.amount ? orderData.amount / 100 : 0);

  const handleClose = () => {
    if (isProcessing) return;
    setIsOpen(false);
    if (onDismiss) onDismiss();
  };

  // 1-Click fill test card
  const handleAutofillCard = (card: typeof TEST_CARDS[0]) => {
    setCardNumber(card.number);
    setCardExpiry(card.expiry);
    setCardCvv(card.cvv);
    toast.info(`Filled with ${card.name}`);
  };

  // Complete Simulated Payment
  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setProcessingStep("Contacting bank gateway...");

    try {
      await new Promise((r) => setTimeout(r, 700));
      setProcessingStep("Verifying 3D-Secure authentication...");

      await new Promise((r) => setTimeout(r, 800));
      setProcessingStep("Authorizing payment with YourTube server...");

      const simulatedPaymentId = `pay_rzp_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const simulatedSignature = `test_simulated_sig_${Date.now()}`;

      // Call backend to verify and apply subscription upgrade
      const verifyRes = await axiosInstance.post("/membership/verify-payment", {
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: simulatedPaymentId,
        razorpay_signature: simulatedSignature,
        userId,
        plan: orderData.plan,
        billingCycle: orderData.billingCycle,
        invoiceNumber: orderData.invoiceNumber,
      });

      await new Promise((r) => setTimeout(r, 400));
      setProcessingStep("Success!");

      toast.success(
        verifyRes.data?.message || `Payment successful! Welcome to ${orderData.plan}.`
      );

      setIsOpen(false);
      setIsProcessing(false);
      onSuccess(verifyRes.data);
    } catch (err: any) {
      console.error("Payment simulator error:", err);
      const errMsg = err.response?.data?.message || "Payment verification failed.";
      toast.error(errMsg);
      setIsProcessing(false);
      setProcessingStep("");
      if (onFailure) onFailure(err);
    }
  };

  // Simulate Gateway Failure
  const handleSimulateFailure = async () => {
    setIsProcessing(true);
    setProcessingStep("Simulating bank decline...");

    try {
      await new Promise((r) => setTimeout(r, 800));
      const failReason = "Bank transaction declined: Test card declined by issuing bank.";

      await axiosInstance.post("/membership/payment-failed", {
        orderId: orderData.orderId,
        paymentId: `pay_fail_${Date.now()}`,
        userId,
        reason: failReason,
        plan: orderData.plan,
        billingCycle: orderData.billingCycle,
      });

      toast.error(failReason);
      setIsOpen(false);
      setIsProcessing(false);
      if (onFailure) onFailure(new Error(failReason));
    } catch (e) {
      setIsProcessing(false);
      setIsOpen(false);
      if (onFailure) onFailure(e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl">
        {/* Razorpay Brand Top Bar */}
        <div className="bg-gradient-to-r from-[#072654] via-[#0c2e64] to-[#072654] text-white p-5 sm:p-6 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-2 shadow-inner">
                {/* Razorpay Brand Style Icon */}
                <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                  <path
                    d="M19.5 4L8 36H16.5L20.5 24.5H27.5L25 36H33.5L39.5 4H19.5Z"
                    fill="#3395FF"
                  />
                  <path
                    d="M17.5 11L14 21.5H23L25.5 11H17.5Z"
                    fill="#FFFFFF"
                  />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg sm:text-xl tracking-tight text-white">
                    Razorpay Checkout
                  </h3>
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Verified Secure
                  </span>
                </div>
                <p className="text-xs text-blue-200/80">
                  YourTube Subscriptions • {orderData.plan} ({orderData.billingCycle})
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                ₹{amountInInr}
              </div>
              <div className="text-[11px] text-blue-200/70 font-mono">
                #{orderData.invoiceNumber || orderData.orderId.substring(0, 12)}
              </div>
            </div>
          </div>

          {/* User info bar */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-blue-100/90 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{orderData.user?.name || "Subscriber"}</span>
              <span className="text-white/40">•</span>
              <span className="text-blue-200/80">{orderData.user?.email || "subscriber@yourtube.com"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>256-bit SSL Encrypted</span>
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
          {/* Left Method Tabs */}
          <div className="md:col-span-4 bg-zinc-50 dark:bg-zinc-950/70 p-3 border-r border-zinc-200 dark:border-zinc-800 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible">
            <button
              onClick={() => setActiveTab("card")}
              className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left text-xs sm:text-sm font-medium transition-all ${
                activeTab === "card"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">Cards</div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 hidden md:block">
                  Visa, Mastercard, RuPay
                </div>
              </div>
              {activeTab === "card" && <ChevronRight className="w-4 h-4 hidden md:block" />}
            </button>

            <button
              onClick={() => setActiveTab("upi")}
              className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left text-xs sm:text-sm font-medium transition-all ${
                activeTab === "upi"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">UPI & QR</div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 hidden md:block">
                  Google Pay, PhonePe, Paytm
                </div>
              </div>
              {activeTab === "upi" && <ChevronRight className="w-4 h-4 hidden md:block" />}
            </button>

            <button
              onClick={() => setActiveTab("netbanking")}
              className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left text-xs sm:text-sm font-medium transition-all ${
                activeTab === "netbanking"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">Net Banking</div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 hidden md:block">
                  HDFC, ICICI, SBI, Axis
                </div>
              </div>
              {activeTab === "netbanking" && <ChevronRight className="w-4 h-4 hidden md:block" />}
            </button>

            <button
              onClick={() => setActiveTab("wallet")}
              className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left text-xs sm:text-sm font-medium transition-all ${
                activeTab === "wallet"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Wallet className="w-4 h-4 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">Wallets</div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 hidden md:block">
                  Paytm, PhonePe, Mobikwik
                </div>
              </div>
              {activeTab === "wallet" && <ChevronRight className="w-4 h-4 hidden md:block" />}
            </button>

            {/* Security Guarantee Box */}
            <div className="mt-auto hidden md:block p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-200">
              <div className="font-semibold flex items-center gap-1.5 mb-1 text-blue-700 dark:text-blue-300">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Bank-Grade Encryption</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[10px]">
                End-to-end 256-bit SSL protection. Instant tier activation and official GST invoice upon completion.
              </p>
            </div>
          </div>

          {/* Right Method Details Panel */}
          <div className="md:col-span-8 p-5 sm:p-6 flex flex-col justify-between">
            {/* 1. CARD TAB */}
            {activeTab === "card" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Credit or Debit Card
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                    <span>1-Click Test Cards:</span>
                  </div>
                </div>

                {/* Autofill quick badges */}
                <div className="flex flex-wrap gap-1.5">
                  {TEST_CARDS.map((tc) => (
                    <button
                      key={tc.name}
                      type="button"
                      onClick={() => handleAutofillCard(tc)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-zinc-100 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-950/50 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 border border-zinc-200 dark:border-zinc-700 transition-colors"
                    >
                      ⚡ {tc.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4111 1111 1111 1111"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <CreditCard className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Name on card"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. UPI TAB */}
            {activeTab === "upi" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Select UPI App or Scan QR
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "gpay", name: "Google Pay", color: "from-blue-500 to-emerald-500" },
                    { id: "phonepe", name: "PhonePe", color: "from-purple-600 to-indigo-600" },
                    { id: "paytm", name: "Paytm UPI", color: "from-sky-500 to-blue-600" },
                    { id: "bhim", name: "BHIM UPI", color: "from-orange-500 to-green-600" },
                  ].map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => {
                        setSelectedUpiApp(app.id);
                        setCustomUpiId(`${orderData.user?.name?.toLowerCase().replace(/\s+/g, "") || "user"}@${app.id}`);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        selectedUpiApp === app.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold shadow-sm"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-gradient-to-tr flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        {app.name.charAt(0)}
                      </div>
                      <div className="text-xs">{app.name}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Or Enter UPI ID / VPA
                  </label>
                  <input
                    type="text"
                    value={customUpiId}
                    onChange={(e) => setCustomUpiId(e.target.value)}
                    placeholder="example@upi or mobile@okhdfcbank"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center gap-3">
                  <QrCode className="w-7 h-7 text-blue-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Scan QR Code via any UPI App
                    </span>
                    <p className="text-zinc-500 text-[11px]">
                      Instant payment verified through sandbox simulated webhook.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. NETBANKING TAB */}
            {activeTab === "netbanking" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Popular Indian Banks
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {POPULAR_BANKS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBank(b.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedBank === b.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      <div className="text-xs font-mono font-bold text-zinc-400 mb-0.5">
                        {b.code}
                      </div>
                      <div className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                        {b.name}
                      </div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Other Banks
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hdfc">HDFC Bank</option>
                    <option value="icici">ICICI Bank</option>
                    <option value="sbi">State Bank of India</option>
                    <option value="axis">Axis Bank</option>
                    <option value="kotak">Kotak Mahindra Bank</option>
                    <option value="yes">Yes Bank</option>
                    <option value="bob">Bank of Baroda</option>
                    <option value="canara">Canara Bank</option>
                  </select>
                </div>
              </div>
            )}

            {/* 4. WALLET TAB */}
            {activeTab === "wallet" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Select Digital Wallet
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "paytm", name: "Paytm Wallet", balance: "₹1,240.00" },
                    { id: "phonepe", name: "PhonePe Wallet", balance: "₹850.00" },
                    { id: "mobikwik", name: "MobiKwik", balance: "₹500.00" },
                    { id: "amazon", name: "Amazon Pay", balance: "₹2,100.00" },
                  ].map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWallet(w.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        selectedWallet === w.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {w.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Test balance: {w.balance}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
              {/* Primary Pay Button */}
              <Button
                onClick={handleSimulatePayment}
                disabled={isProcessing}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{processingStep || "Processing Payment..."}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay ₹{amountInInr} Securely</span>
                  </>
                )}
              </Button>

              {/* Secondary Actions */}
              <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                <button
                  type="button"
                  onClick={handleSimulateFailure}
                  disabled={isProcessing}
                  className="text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
                >
                  Simulate Bank Decline / Error
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  Cancel & Return
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
