import express from "express";
import { addToCart, getCartProducts, removeAllFromCart, updateQuantity } from "../controllers/cart.controller.js";
import { protectRoute, verifiedEmail } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, verifiedEmail, getCartProducts);
router.post("/", protectRoute, verifiedEmail, addToCart);
router.delete("/", protectRoute, verifiedEmail, removeAllFromCart);
router.post("/update", protectRoute, verifiedEmail, updateQuantity);

export default router;
