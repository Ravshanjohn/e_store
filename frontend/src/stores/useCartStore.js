import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useCartStore = create((set, get) => ({
	cart: [],
	coupon: null,
	total: 0,
	subtotal: 0,
	isCouponApplied: false,

	getMyCoupon: async () => {
		try {
			const response = await axios.get("/coupons");
			console.log("Coupon fetched:", response.data);
			set({ coupon: response.data });
		} catch (error) {
			console.error("Error fetching coupon:", error.response?.data || error.message);
			set({ coupon: null });
		}
	},
	applyCoupon: async (coupon) => {
		try {
			const response = await axios.post("/coupons", { coupon });
			// Merge the validation response with the existing coupon data
			set((state) => ({
				coupon: { ...state.coupon, ...response.data },
				isCouponApplied: true,
			}));
			get().calculateTotals();
			toast.success("Coupon applied successfully");
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to apply coupon");
			set({ isCouponApplied: false });
		}
	},
	
	removeCoupon: async () => {
		set({ coupon: null, isCouponApplied: false });
		get().calculateTotals();
		toast.success("Coupon removed");
	},

	getCartItems: async () => {
		try {
			const res = await axios.get("/cart");
			set({ cart: res.data.result });
			console.log("Cart items fetched:", res.data.result);
			get().calculateTotals();
		} catch (error) {
			set({ cart: [] });
			toast.error(error.response.data.message || "An error occurred");
		}
	},
	
	clearCart: async () => {
		set({ cart: [], coupon: null, total: 0, subtotal: 0, isCouponApplied: false });
	},

	addToCart: async (product, quantity) => {
		try {
			await axios.post("/cart", { productId: product.id, quantity: quantity || 1 });
			toast.success("Product added to cart");

			set((prevState) => {
				const existingItem = prevState.cart.find((item) => item.id === product.id);
				const newCart = existingItem
					? prevState.cart.map((item) =>
							item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
					  )
					: [...prevState.cart, { ...product, quantity: 1 }];
				return { cart: newCart };
			});
			get().calculateTotals();
		} catch (error) {
			return toast.error(error.response.data.message || "An error occurred");
		}
	},

	removeFromCart: async (productId) => {
		await axios.delete(`/cart`, { data: { productId } });
		set((prevState) => ({ cart: prevState.cart.filter((item) => item.id !== productId) }));
		get().calculateTotals();
	},

	updateQuantity: (productId, direction) => {
		const item = get().cart.find((item) => item.id === productId);
		if (!item) return;

		if (item.quantity === 1 && direction === "minus") {
			get().removeFromCart(productId);
			return;
		}

		set((prevState) => {
			const newCart = prevState.cart.map((item) => {
				if (item.id === productId) {
					if (direction === "plus") {
						return { ...item, quantity: item.quantity + 1 };
					} else {
						return { ...item, quantity: item.quantity - 1 };
					}
				}
				return item;
			});
			return { cart: newCart };
		});
		get().calculateTotals();

		axios.post("/cart/update", { direction, productId }).catch((error) => {
			toast.error(error.response?.data?.message || "Failed to update quantity");
			get().getCartItems();
		});
	},

	calculateTotals: () => {
		const { cart, coupon, isCouponApplied } = get();
		console.log(cart)
		const subtotal = cart.reduce((sum, item) => sum + (item.sale_price || item.price) * item.quantity, 0);
		let total = subtotal;

		if (coupon && isCouponApplied) {
			const discount = subtotal * (coupon.discount_value / 100);
			total = subtotal - discount;
		}

		set({ subtotal, total });
	},
}));
