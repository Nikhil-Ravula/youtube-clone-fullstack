import express from "express";
import { login, updateprofile, getuserbyid } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.get("/:id", getuserbyid);
routes.patch("/update/:id", updateprofile);
export default routes;

