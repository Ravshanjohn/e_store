import { database } from "../lib/db.js";

export const getCartProducts = async (req, res) => {
	const userId = req.user.id;
	if (!userId) return res.status(400).json({ message: "User not found" });

	try {
		const {data, error} = await database.from('cart_items').select('product_id, quantity').eq("user_id", userId);
		if(error) return res.status(400).json({ message: "Error fetching data" });

		// Extract product IDs from cart items
		const productIds = data.map(item => item.product_id);

		const {data: products, error: ProductsError} = await database.from('products')
			.select('id, name, sale_price, image_url, description')
			.in('id', productIds);
		if(ProductsError) return res.status(400).json({ message: "Error fetching products" });

		// Map products by their ID for easy lookup
		const productsMap = {};
		products.forEach(product => {
			productsMap[product.id] = product;
		});

		
		// Combine cart items with product details
		const result = data.map(item => ({
			...item,
			...productsMap[item.product_id]
		}));
		const total = result.map(item => item.sale_price * item.quantity).reduce((a, b) => a + b, 0);

		return res.status(200).json({result: result, total: total});
	} catch (error) {
		console.log("Error in getCartProducts controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const addToCart = async (req, res) => {
	const userId = req.user.id;
	const {productId, quantity} = req.body;
	if(!userId) return res.status(400).json({ message: "User not found" });
	const qty = Number(quantity);
	if (Number.isNaN(qty) || qty < 1) {
		return res.status(400).json({ message: "Quantity must be at least 1" });
	}

	try {
		const {error} = await database.rpc('add_or_update_cart_items', {
			p_user_id: userId,
			p_product_id: productId,
			p_quantity: qty
		});
		if(error) return res.status(400).json({ message: "Error updating cart", error });

		return res.status(200).json({message: "Added to the cart"});
	} catch (error) {
		console.error("Error in addToCart controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateQuantity = async (req, res) => {
	const {direction, productId} = req.body;
	const userId = req.user.id;
	if (!["plus", "minus"].includes(direction)) return res.status(400).json({ message: "direction not defined" });	
	if (!userId) return res.status(400).json({ message: "User not found" });

	try {
		const{data: findProduct, error: fetchingProduct} = await database.from('cart_items')
			.select().eq("product_id", productId).eq("user_id", userId).maybeSingle();

		if(fetchingProduct) return res.status(400).json({ message: "DB error"});
		if(!findProduct) return res.status(400).json({ message: "Product not found" });
		const {error} = await database.rpc('update_cart_quantity', {
			p_user_id: userId,
			p_product_id: productId,
			p_direction: direction
		});

		if(error) return res.status(400).json({message: "Error updating quantity"});

		return res.status(200).json({message: "Quantity updated" });
	} catch (error) {
		console.error("updateQuantity error:", error.message);
		return res.status(500).json({ message: "Server error" });
	}
};

export const removeAllFromCart = async (req, res) => {
	const userId = req.user.id;
	const {productId} = req.body;
	if (!userId) return res.status(400).json({ message: "User not found" });
	if (!productId) return res.status(400).json({ message: "Product ID is required" });

	try {
		const {error} = await database.from('cart_items').delete().eq('product_id', productId).eq('user_id', userId);
		if(error) return res.status(400).json({message: "Error deleting cart item"});

		return res.status(200).json({ message: "Deleted succussfully" });
	} catch (error) {
		console.error("removeAllFromCart error:", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

