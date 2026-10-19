import express from "express";
import {
  login,
  verifyOtp,
  resendOtp,
  getSecurityOverview,
  revokeTrustedDevice,
  revokeAllDevices,
  updateTheme,
  updateprofile,
  getuserbyid,
} from "../controllers/auth.js";

const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-otp", verifyOtp);
routes.post("/resend-otp", resendOtp);

// Security & Trusted Devices Management
routes.get("/security/:id", getSecurityOverview);
routes.delete("/security/:id/trusted-device/:deviceId", revokeTrustedDevice);
routes.post("/security/:id/revoke-all-devices", revokeAllDevices);

// Theme Synchronization
routes.put("/theme", updateTheme);

// Profile & User endpoints
routes.get("/:id", getuserbyid);
routes.patch("/update/:id", updateprofile);

export default routes;
