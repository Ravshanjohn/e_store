import Coupon from "../models/coupon.model.js";

export const getCoupon = async (req, res) => {
	try {
		console.log('Getting coupon for user:', req.user._id);
		const coupon = await Coupon.findOne({ userId: req.user._id, isActive: true });
		console.log('Coupon found:', coupon);
		res.json(coupon || null);
	} catch (error) {
		console.log("Error in getCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const createCoupon = async (req, res) => {
	try {
		const { code, discountPercentage, expirationDate } = req.body;
		
		// Check if coupon already exists for user
		const existingCoupon = await Coupon.findOne({ userId: req.user._id });
		if (existingCoupon) {
			return res.status(400).json({ message: "User already has a coupon" });
		}

		const coupon = new Coupon({
			code,
			discountPercentage,
			expirationDate: new Date(expirationDate),
			userId: req.user._id,
			isActive: true,
		});

		await coupon.save();
		res.status(201).json(coupon);
	} catch (error) {
		console.log("Error in createCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const validateCoupon = async (req, res) => {
	try {
		const { code } = req.body;
		const coupon = await Coupon.findOne({ code: code, userId: req.user._id, isActive: true });

		if (!coupon) {
			return res.status(404).json({ message: "Coupon not found" });
		}

		if (coupon.expirationDate < new Date()) {
			coupon.isActive = false;
			await coupon.save();
			return res.status(404).json({ message: "Coupon expired" });
		}

		res.json({
			message: "Coupon is valid",
			code: coupon.code,
			discountPercentage: coupon.discountPercentage,
		});
	} catch (error) {
		console.log("Error in validateCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
