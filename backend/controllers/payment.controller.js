import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { stripe } from "../lib/stripe.js";

export const createCheckoutSession = async (req, res) => {
	try {
		const { products, couponCode } = req.body;

		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Invalid or empty products array" });
		}

		let totalAmount = 0;

		const lineItems = products.map((product) => {
			const amount = Math.round(product.price * 100); // stripe wants u to send in the format of cents
			totalAmount += amount * product.quantity;

			return {
				price_data: {
					currency: "usd",
					product_data: {
						name: product.name,
						images: [product.image],
					},
					unit_amount: amount,
				},
				quantity: product.quantity || 1,
			};
		});

		let coupon = null;
		if (couponCode) {
			coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
			if (coupon) {
				totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
			}
		}

		// Get the base URL from environment or construct from request
		const clientUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items: lineItems,
			mode: "payment",
			success_url: `${clientUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${clientUrl}/purchase-cancel`,
			discounts: coupon
				? [
						{
							coupon: await createStripeCoupon(coupon.discountPercentage),
						},
				  ]
				: [],
			metadata: {
				userId: req.user._id.toString(),
				couponCode: couponCode || "",
				products: JSON.stringify(
					products.map((p) => ({
						id: p._id,
						quantity: p.quantity,
						price: p.price,
					}))
				),
			},
		});

		res.status(200).json({ id: session.id, url: session.url, totalAmount: totalAmount / 100 });
	} catch (error) {
		console.error("Error processing checkout:", error);
		res.status(500).json({ message: "Error processing checkout", error: error.message });
	}
};

export const checkoutSuccess = async (req, res) => {
	try {
		const { sessionId } = req.body;
		console.log('Processing checkout success for session:', sessionId);
		
		if (!sessionId) {
			return res.status(400).json({ message: "Session ID is required" });
		}

		// Check if order already exists FIRST to prevent duplicate processing
		const existingOrder = await Order.findOne({ stripeSessionId: sessionId });
		if (existingOrder) {
			console.log('Order already exists for this session, skipping duplicate processing');
			return res.status(200).json({
				success: true,
				message: "Order already processed",
				orderId: existingOrder._id,
			});
		}

		let session;
		try {
			session = await stripe.checkout.sessions.retrieve(sessionId);
			console.log('Session retrieved successfully');
			console.log('Payment status:', session.payment_status);
		} catch (stripeError) {
			console.error('Stripe session retrieval error:', stripeError.message);
			return res.status(400).json({ message: "Invalid session ID", error: stripeError.message });
		}

		// Clear cart regardless of payment status (for testing purposes)
		const userId = session.metadata?.userId || req.user._id;
		console.log('Clearing cart for user:', userId);
		
		await User.findByIdAndUpdate(userId, { cartItems: [] });
		console.log('Cart cleared successfully');

		if (session.payment_status === "paid") {

			if (session.metadata.couponCode) {
				await Coupon.findOneAndUpdate(
					{
						code: session.metadata.couponCode,
						userId: session.metadata.userId,
					},
					{
						isActive: false,
					}
				);
			}

			// create a new Order
			const products = JSON.parse(session.metadata.products);
			const newOrder = new Order({
				user: session.metadata.userId,
				products: products.map((product) => ({
					product: product.id,
					quantity: product.quantity,
					price: product.price,
				})),
				totalAmount: session.amount_total / 100,
				stripeSessionId: sessionId,
			});

		await newOrder.save();
		console.log('Order created successfully');

		// Create new coupon for future use if order total >= $20
		if (session.amount_total >= 2000) {
			console.log('Order qualifies for coupon. Total:', session.amount_total / 100);
			try {
				const newCoupon = await createNewCoupon(session.metadata.userId);
				console.log('New coupon created:', newCoupon.code);
			} catch (couponError) {
				console.error('Error creating coupon:', couponError.message);
				// Don't fail the order if coupon creation fails
			}
		}

		res.status(200).json({
				success: true,
				message: "Payment successful, order created, and cart cleared.",
				orderId: newOrder._id,
			});
		} else {
			// Even if not paid, return success for cart clearing
			res.status(200).json({
				success: true,
				message: "Cart cleared. Payment status: " + session.payment_status,
			});
		}
	} catch (error) {
		console.error("Error processing successful checkout:", error);
		console.error("Error stack:", error.stack);
		res.status(500).json({ message: "Error processing successful checkout", error: error.message });
	}
};

async function createStripeCoupon(discountPercentage) {
	const coupon = await stripe.coupons.create({
		percent_off: discountPercentage,
		duration: "once",
	});

	return coupon.id;
}

async function createNewCoupon(userId) {
	console.log('Creating new coupon for user:', userId);
	await Coupon.findOneAndDelete({ userId });

	const newCoupon = new Coupon({
		code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
		discountPercentage: 10,
		expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
		userId: userId,
	});

	await newCoupon.save();
	console.log('Coupon saved successfully:', newCoupon.code, 'for user:', userId);

	return newCoupon;
}
