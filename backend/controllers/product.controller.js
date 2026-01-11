import { database } from "../lib/db.js";

export const getAllProducts = async (req, res) => {
	try {
		const {data, error} = await database.from('products').select('*');

		if(error) throw error;

		return res.status(200).json({data});
	} catch (error) {
		console.log("Error in getAllProducts controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getAllActiveProducts = async (req, res) => {
	try {
		const {data, error} = await database.from('products').select('*').eq('is_active', true);
		if(error) throw error;

		return res.status(200).json({data}	);
	} catch (error) {
		console.log("Error in getAllActiveProducts controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
}

export const getFeaturedProducts = async (req, res) => {
	try {
		const {data, error} = await database.from('products').select('id, name, sale_price, is_featured, image_url, category').eq('is_featured', true).eq('is_active', true);

		if(error) throw error;

		return res.status(200).json({data});
	} catch (error) {
		console.log("Error in getFeaturedProducts controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const createProduct = async (req, res) => {
	try {
		const { name, original_price, sale_price, image_url, category, stock, description } = req.body;
		const required = {name, original_price, sale_price, image_url, category, stock, description};

		for(let[key, value] of Object.entries(required)){
			if(!value) return res.status(400).json({message: `${key} is required`});
		}
		if(sale_price <= original_price) return res.status(400).json({message: "Please check the sale and original price"})
		
		
		const { data: existingProducts, error: existingProductsError } = await database
			.from('products')
			.select('name')
			.eq('name', name);

		if (existingProductsError) throw existingProductsError;

		if (existingProducts && existingProducts.length > 0) {
			return res.status(400).json({ message: "Product exists" });
		}

		const { data, error } = await database.from('products').insert([{name, original_price, sale_price, image_url, category, stock, description}]).select('*');

		if(error) throw error;

		return res.status(200).json({message: "Product created successfully", product: data[0]})
	} catch (error) {
		console.log("Error in createProduct controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const deleteProduct = async (req, res) => {
	try { 
		const {id} = req.params;

		if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: "Invalid product id" });
    }

		const {data: findProduct, error: errorFindingPRoduct} = await database.from('products').select('*').eq('id', id);

		if(errorFindingPRoduct) throw errorFindingPRoduct;

		if (!findProduct || findProduct.length === 0) {
      return res.status(404).json({ message: "Product does not exist" });
    }

		const {data, error} = await database.from('products').update({ is_active: false }).eq('id', id).select('*');

		if(error) throw error;

		if(!data || data.length === 0){
			return res.status(404).json({message: "Product not found"})
		}

		return res.status(200).json({ message: "Product deleted successfully:", data: data[0] });
	} catch (error) {
		console.log("Error in deleteProduct controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};


export const getProductsByCategory = async (req, res) => {
	const { category } = req.params;
	try {
		const {data, error} = await database.from('products')
			.select('id, name, sale_price, image_url, is_featured, category, stock')
			.eq('category', category)
			.eq('is_active', true);

		if(error) throw error;
		return res.status(200).json({data});
	} catch (error) {
		console.log("Error in getProductsByCategory controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const toggleFeaturedProduct = async (req, res) => {
	try {
		const { id } = req.params;

		const { data: existingProduct, error:fetchError } = await database.from('products').select('id, is_featured').eq('id', id).eq('is_active', true).single();

		if( fetchError ) return res.status(404).json({message: "Product not found"});

		if(!existingProduct) return res.status(404).json({message: "Product not found"})

		const {error: updateError} = await database.from('products').update({ is_featured: !existingProduct.is_featured }).eq('id', id).single();

		if(updateError) return res.status(400).json({message: "Errow with updating product"});


		return res.status(200).json({ message: "Product toggled successfully", is_featured: !existingProduct.is_featured });
	} catch (error) {
		console.log("Error in toggleFeaturedProduct controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

//Review
export const productReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const parsedProductId = Number(productId);
    if (isNaN(parsedProductId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const { rating, review } = req.body;

    // Validate rating and review
    if (rating === undefined || rating === null) {
      return res.status(400).json({ message: "Rating is required" });
    }
    if (!review || !review.trim()) {
      return res.status(400).json({ message: "Review cannot be empty" });
    }
    const trimmedReview = review.trim();
    if (trimmedReview.length > 500) {
      return res.status(400).json({ message: "Review cannot exceed 500 characters" });
    }
    const parsedRating = Number(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
    }

    // Check if product exists
    const { data: product, error: productError } = await database
      .from('products')
      .select('id')
      .eq('id', parsedProductId)
			.eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user exists 
    const { data: user, error: userError } = await database
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { data: existingReview } = await database
      .from('product_reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', parsedProductId)
      .single();

    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    // Insert review
    const { error } = await database.from('product_reviews').insert({
      product_id: parsedProductId,
      user_id: userId,
      rating: parsedRating,
      review: trimmedReview,
    });

    if (error) throw error;

    return res.status(200).json({ message: "Thank you! Your review has been posted." });
  } catch (error) {
    console.error("Error in productReview controller:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};


