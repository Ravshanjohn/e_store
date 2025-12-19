import jwt from "jsonwebtoken";
import { database } from "../lib/db.js";

export const protectRoute = async (req, res, next) => {
	try {
		const token = req.cookies.jwt;

		if (!token) {
			return res.status(401).json({ message: "Unauthorized - No access token provided" });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		if (!decoded?.id) {
			return res.status(401).json({ message: "Unauthorized - Invalid access token" });
		}

		const { data, error } = await database
			.from("users")
			.select("id, name, email, role, is_verified")
			.eq("id", decoded.id)
			.single();

		if (error || !data) {
			return res.status(401).json({ message: "User not found" });
		}

		req.user = data;

		next();
	} catch (error) {
		console.log("Error in protectRoute middleware", error.message);
		return res.status(401).json({ message: "Unauthorized - Invalid access token" });
	}
};

export const adminRoute = (req, res, next) => {
	if (req.user && req.user.role === "admin") {
		next();
	} else {
		return res.status(403).json({ message: "Access denied - Admin only" });
	}
};
