import express from "express";
import {
  getallvideo,
  uploadvideo,
  checkVideoAccess,
  setVideoPremiumStatus,
} from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", upload.single("file"), uploadvideo);
routes.get("/getall", getallvideo);
routes.get("/access/:videoId", checkVideoAccess);
routes.patch("/set-premium/:id", setVideoPremiumStatus);
export default routes;
