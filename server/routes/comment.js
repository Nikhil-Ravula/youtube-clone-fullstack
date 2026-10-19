import express from "express";
import {
  postcomment,
  getallcomment,
  getcommentreplies,
  editcomment,
  deletecomment,
  likecomment,
  dislikecomment,
  reportcomment,
  translatecomment,
  getcaptchachallenge,
  getsupportedlanguages,
} from "../controllers/comment.js";

const routes = express.Router();

// Public / Feed routes
routes.get("/languages", getsupportedlanguages);
routes.get("/captcha", getcaptchachallenge);
routes.post("/translate", translatecomment);
routes.get("/replies/:parentCommentId", getcommentreplies);
routes.get("/:videoid", getallcomment);

// Comment Actions
routes.post("/postcomment", postcomment);
routes.post("/editcomment/:id", editcomment);
routes.delete("/deletecomment/:id", deletecomment);

// Reactions & Moderation
routes.post("/like/:id", likecomment);
routes.post("/dislike/:id", dislikecomment);
routes.post("/report/:id", reportcomment);

export default routes;
