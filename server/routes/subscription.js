import express from "express";
import {
  toggleSubscription,
  getSubscriptionStatus,
  getUserSubscriptions,
} from "../controllers/subscription.js";

const routes = express.Router();

routes.post("/toggle", toggleSubscription);
routes.get("/status/:channelId", getSubscriptionStatus);
routes.get("/user/:subscriberId", getUserSubscriptions);

export default routes;
