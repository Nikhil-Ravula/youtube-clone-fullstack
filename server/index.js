import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import path from "path";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import meetingroutes from "./routes/meeting.js";
import subscriptionroutes from "./routes/subscription.js";
import { initializeSocket } from "./socket.js";

dotenv.config();
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with WebRTC signaling
initializeSocket(server);

app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));

app.get("/", (req, res) => {
  res.send("You tube backend is working");
});

app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/meeting", meetingroutes);
app.use("/subscription", subscriptionroutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`server running on port ${PORT} with Socket.IO enabled`);
});

const DBURL = process.env.DB_URL;
mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });
