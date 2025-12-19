
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";
import { database } from "../lib/db.js"
import { features } from "process";

export const getAllProducts = async (req, res) => {
	try {
		const {data, error} = await database.from('products').select('id, name, sale_price, is_featured, image_url, category');

		if(error) throw error;

		return res.status(200).json({data});
	} catch (error) {
		console.log("Error in getAllProducts controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getFeaturedProducts = async (req, res) => {
	try {
		const {data, error} = await database.from('products').select('id, name, sale_price, is_featured, image_url, category').eq('is_featured', true);

		if(error) throw error;

		return res.status(200).json({data});
	} catch (error) {
		console.log("Error in getFeaturedProducts controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const createProduct = async (req, res) => {
	try {
		const { name, original_price, sale_price, is_featured, image_url, category } = req.body;

		if( !name || !original_price || !sale_price || !is_featured || !image_url || category === "indefined" || !category){
			return res.status(400).json({ message: "All fields required" });
		};
		
		const { data: existingProducts, err } = await database
			.from('products')
			.select('name')
			.eq('name', name);

		if (err) throw error;

		if (existingProducts.length > 0) {
			return res.status(400).json({ message: "Product exists" });
		}

		const { data, error } = await database.from('products').insert([{name, original_price, sale_price, is_featured, image_url, category}]).select('id, name, sale_price, is_featured, image_url, category');

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

		const {data, error} = await database.from('products').delete().eq('id', id).select('id, name');

		if(error) throw error;

		if(!data || data.length === 0){
			return res.status(404).json({message: "Product not found"})
		}

		return res.json({ message: `Product ${data[0].name} deleted successfully` });
	} catch (error) {
		console.log("Error in deleteProduct controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};


export const getProductsByCategory = async (req, res) => {
	const { category } = req.params;
	try {
		const {data, error} = await database.from('products').select('id, name, sale_price, image_url, is_featured, category').eq('category', category)
		return res.status(200).json({data});
	} catch (error) {
		console.log("Error in getProductsByCategory controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const toggleFeaturedProduct = async (req, res) => {
	try {
		const { id } = req.params;

		const { data: existingProduct, error:fetchError } = await database.from('products').select('id, is_featured').eq('id', id).single();

		if( fetchError ) return res.status(404).json({message: "Product not found"});

		const {error: updateError} = await database.from('products').update({ is_featured: !existingProduct.is_featured }).eq('id', id).single();

		if(updateError) return res.status(400).json({message: "Errow with updating product"});


		return res.status(200).json({ message: "Product toggled successfully", is_featured: !existingProduct.is_featured });
	} catch (error) {
		console.log("Error in toggleFeaturedProduct controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};
