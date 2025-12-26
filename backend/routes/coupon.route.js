import express from "express";
import { protectRoute, verifiedEmail } from "../middleware/auth.middleware.js";
import { getCoupon } from "../controllers/coupon.controller.js";

const router = express.Router();

router.post("/", protectRoute, verifiedEmail, getCoupon);

export default router;
