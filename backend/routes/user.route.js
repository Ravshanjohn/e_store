import express from "express";
import { getProfile, updateProfile } from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/profile/:id", protectRoute, getProfile);
router.post("/profile/:id", protectRoute, updateProfile);

export default router;