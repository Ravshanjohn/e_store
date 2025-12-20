import express from "express";
import {
	createProduct,
	deleteProduct,
	getAllProducts,
	getFeaturedProducts,
	getProductsByCategory,
	toggleFeaturedProduct,
} from "../controllers/product.controller.js";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/featured", getFeaturedProducts);
router.get("/category/:category", getProductsByCategory);

//admin
router.get("/admin/", protectRoute, adminRoute, getAllProducts);
router.post("/admin/", protectRoute, adminRoute, createProduct);
router.patch("/admin/:id", protectRoute, adminRoute, toggleFeaturedProduct);
router.delete("/admin/:id", protectRoute, adminRoute, deleteProduct);

export default router;
