import { create } from "zustand";
import { toast } from "react-hot-toast";
import axios from "../lib/axios";

export const useProductStore = create((set, get) => ({
	products: [],
	loading: false,

	setProducts: (products) => set({ products }),

	createProduct: async (productData) => {
		set({ loading: true });
		try {
			const res = await axios.post("/products/admin", productData);
			set((prevState) => ({
				products: [...prevState.products, res.data.product],
				loading: false,
			}));
			toast.success("Product created successfully");
		} catch (error) {
			toast.error(error.response.data.error);
			set({ loading: false });
		}
	},

	fetchAllProducts: async () => {
		if (get().loading) return;
		set({ loading: true });
		try {
			const response = await axios.get("/products/admin/active");
			set({ products: response.data.data, loading: false });
		} catch (error) {
			set({ error: "Failed to fetch products", loading: false });
			toast.error(error.response?.data.error || "Failed to fetch all products");
		}
	},

	fetchProductsByCategory: async (category) => {
		set({ loading: true });
		try {
			const response = await axios.get(`/products/category/${category}`);
			set({ products: response.data.data, loading: false });
			console.log("Fetched products by category:", response.data.data);
		} catch (error) {
			set({ error: "Failed to fetch products", loading: false });
			toast.error(error.response?.data?.error || "Failed to fetch products by category");
		}
	},
	deleteProduct: async (productId) => {
		set({ loading: true });
		try {
			await axios.delete(`/products/admin/${productId}`);
			set((prevProducts) => ({
				products: prevProducts.products.filter((product) => product.id !== productId),
				loading: false,
			}));
		} catch (error) {
			set({ loading: false });
			toast.error(error.response.data.error || "Failed to delete product");
		}
	},
	toggleFeaturedProduct: async (productId) => {
		set({ loading: true });
		try {
			const response = await axios.patch(`/products/admin/${productId}`);
			// this will update the isFeatured prop of the product
			set((prevProducts) => ({
				products: prevProducts.products.map((product) =>
					product.id === productId ? { ...product, is_featured: response.data.is_featured } : product
				),
				loading: false,
			}));
		} catch (error) {
			set({ loading: false });
			toast.error(error.response.data.error || "Failed to update product");
		}
	},
	fetchFeaturedProducts: async () => {
		set({ loading: true });
		try {
			const response = await axios.get("/products/featured");
			set({ products: response.data.data, loading: false });
		} catch (error) {
			set({ error: "Failed to fetch products", loading: false });
			console.log("Error fetching featured products:", error);
		}
	},
}));
