import express from "express";
import { protectRoute, verifiedEmail } from "../middleware/auth.middleware.js";
import { checkoutSuccess, createCheckoutSession } from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/create-checkout-session", protectRoute, verifiedEmail, createCheckoutSession);
router.post("/checkout-success", protectRoute, verifiedEmail, checkoutSuccess);

export default router;
