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
			.select("id, first_name, last_name, email, role, is_verified")
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

export const verifiedEmail = (req, res, next) => {
  if (!req.user.is_verified) {
    return res.status(403).json({ message: "Not verified user" });
  }
  next();
};

export const adminRoute = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  next();
};
