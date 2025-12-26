import { database } from "../lib/db.js";

export const getCoupon = async (req, res) => {
	const {coupon} = req.body;
	if(!coupon) return res.status(400).json({message: "Coupon code required"})
	try {
		const {data, error} = await database.from('coupons')
			.select('description, discount_value, max_usage, used_count, valid_until, min_order_amount')
			.eq('active', true).eq('code', coupon).maybeSingle();
		if(error) throw error;
		if(!data) return res.status(400).json({message: "Coupon not found"});

		//Check validation
		const now = Date.now();
		const validUntil = new Date(data.valid_until).getTime();
		if (now > validUntil) return res.status(400).json({ message: "Coupon no longer valid" });
		if(data.used_count >= data.max_usage) return res.status(400).message({ message: "Coupon no longer valid"});

		return res.status(200).json(data);
	} catch (error) {
		console.log("Error in getCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
