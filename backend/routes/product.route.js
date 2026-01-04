import express from "express";
import {
	createProduct,
	deleteProduct,
	getAllActiveProducts,
	getAllProducts,
	getFeaturedProducts,
	getProductsByCategory,
	productReview,
	toggleFeaturedProduct,
} from "../controllers/product.controller.js";
import { adminRoute, protectRoute, verifiedEmail } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/featured", getFeaturedProducts);
router.get("/category/:category", getProductsByCategory);
router.post("/review/:productId", protectRoute, verifiedEmail, productReview);

//admin
router.get("/admin/all", protectRoute, verifiedEmail, adminRoute, getAllProducts);
router.get("/admin/active", protectRoute, verifiedEmail, adminRoute, getAllActiveProducts);
router.post("/admin", protectRoute, verifiedEmail, adminRoute, createProduct);
router.patch("/admin/:id", protectRoute, verifiedEmail, adminRoute, toggleFeaturedProduct);
router.delete("/admin/:id", protectRoute, verifiedEmail, adminRoute, deleteProduct);



export default router;
