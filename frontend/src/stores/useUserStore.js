import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useUserStore = create((set, get) => ({
	user: null,
	loading: false,
	checkingAuth: true,

	signup: async ({ first_name, last_name, email, password, confirmPassword }) => {
		set({ loading: true });

		if (password !== confirmPassword) {
			set({ loading: false });
			return toast.error("Passwords do not match");
		}

		try {
			first_name = first_name.trim();
			last_name = last_name.trim();
			const res = await axios.post("/auth/signup", { email, password, first_name, last_name});
			set({ loading: false });

			toast.success(res.data.message);
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "An error occurred");
		}
	},

	login: async (email, password) => {
		set({ loading: true });

		try {
			const res = await axios.post("/auth/login", { email, password });

			set({ user: res.data.user, loading: false });
			toast.success(res.data.message);
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "An error occurred");
		}
	},

	logout: async () => {
		try {
			await axios.post("/auth/logout");
			set({ user: null });
		} catch (error) {
			toast.error(error.response?.data?.message || "An error occurred during logout");
		}
	},

	checkAuth: async () => {
		set({ checkingAuth: true });
		try {
			const response = await axios.get("/auth/auth-check");
			set({ user: response.data, checkingAuth: false });
		} catch (error) {
			console.log(error.message);
			set({ checkingAuth: false, user: null });
		}
	},

	refreshToken: async () => {
		// Prevent multiple simultaneous refresh attempts
		if (get().checkingAuth) return;

		set({ checkingAuth: true });
		try {
			const response = await axios.post("/auth/refresh-token");
			set({ checkingAuth: false });
			return response.data;
		} catch (error) {
			set({ user: null, checkingAuth: false });
			throw error;
		}
	},

	verifyEmail: async (token) => {
		set({ loading: true });
		try {
			const res = await axios.post(`/auth/email-verification/${token}`);
			set({ loading: false });
			toast.success(res.data.message);
			return true;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "An error occurred");
			return false;
		}
	},

	sendVerificationEmail: async (email) => {
		set({ loading: true });
		try {
			const res = await axios.post("/auth/verify_email", { email });
			set({ loading: false });
			toast.success(res.data.message);
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "An error occurred");
		}
	},

	forgetPassword: async (email) => {
		set({ loading: true });
		try {
			const res = await axios.post("/auth/forgot_password", { email });
			set({ loading: false });
			toast.success(res.data.message);
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "An error occurred");
		}
	},

	
	resetPassword: async (token, newPassword) => {
		set({ loading: true });
		try {
			const res = await axios.post(`/auth/reset-password/${token}`, { newPassword });
			set({ loading: false });
			toast.success(res.data.message);
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "An error occurred");
		}
	},
}));

// TODO: Implement the axios interceptors for refreshing access token

// Axios interceptor for token refresh
let refreshPromise = null;

axios.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;
		if (
			error.response?.status === 401 &&
			!originalRequest._retry &&
			!originalRequest.url.includes("/auth/login") &&
			!originalRequest.url.includes("/auth/signup")
		) {
			originalRequest._retry = true;

			try {
				// If a refresh is already in progress, wait for it to complete
				if (refreshPromise) {
					await refreshPromise;
					return axios(originalRequest);
				}

				// Start a new refresh process
				refreshPromise = useUserStore.getState().refreshToken();
				await refreshPromise;
				refreshPromise = null;

				return axios(originalRequest);
			} catch (refreshError) {
				// If refresh fails, redirect to login or handle as needed
				useUserStore.getState().logout();
				return Promise.reject(refreshError);
			}
		}
		return Promise.reject(error);
	}
);
