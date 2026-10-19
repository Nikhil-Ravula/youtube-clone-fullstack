import express from "express";
import {
  getallhistoryVideo,
  handlehistory,
  handleview,
  deletehistory,
  savewatchprogress,
  getwatchprogress,
} from "../controllers/history.js";

const routes = express.Router();
routes.get("/progress/:videoId", getwatchprogress);
routes.post("/progress/:videoId", savewatchprogress);
routes.get("/:userId", getallhistoryVideo);
routes.post("/views/:videoId", handleview);
routes.post("/:videoId", handlehistory);
routes.delete("/:id", deletehistory);
export default routes;
