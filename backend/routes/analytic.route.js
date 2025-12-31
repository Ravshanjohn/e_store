import express from "express";
import { adminRoute, protectRoute, verifiedEmail } from "../middleware/auth.middleware.js";
import { getAnalyticsData, totalRevenueByDay, totalRevenueByMonth } from "../controllers/analytic.controller.js";

const router = express.Router();

router.get("/", protectRoute, verifiedEmail, adminRoute, async (req, res) => {
	try {
		const analyticsData = await getAnalyticsData();

		res.json({
			analyticsData,
		});
	} catch (error) {
		console.log("Error in analytics route", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
});

router.get("/revenue-by-month", protectRoute, verifiedEmail, adminRoute, totalRevenueByMonth);
router.get("/revenue-by-day", protectRoute, verifiedEmail, adminRoute, totalRevenueByDay);

export default router;
