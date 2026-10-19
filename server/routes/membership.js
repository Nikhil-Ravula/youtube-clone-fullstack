import express from "express";
import {
  getPlans,
  getSubscriptionStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handlePaymentFailure,
  cancelSubscription,
  downgradeSubscription,
  getBillingHistory,
  getInvoiceDetails,
  checkExpirationsSweep,
} from "../controllers/membership.js";

const router = express.Router();

router.get("/plans", getPlans);
router.get("/status/:userId", getSubscriptionStatus);
router.post("/create-order", createRazorpayOrder);
router.post("/verify-payment", verifyRazorpayPayment);
router.post("/payment-failed", handlePaymentFailure);
router.post("/cancel", cancelSubscription);
router.post("/downgrade", downgradeSubscription);
router.get("/history/:userId", getBillingHistory);
router.get("/invoice/:invoiceNumber", getInvoiceDetails);
router.post("/check-expirations", checkExpirationsSweep);

export default router;
