import express from "express";
import { checkAuthStatus, forgotPassword, login, logout, resetPassword, signup, verifyAccount, verifyEmail } from "../controllers/auth.controller.js";
import { protectRoute, verifiedEmail } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify_email", verifyEmail);
router.post("/forgot_password", forgotPassword);
router.post("/email-verification/:token", verifyAccount);
router.post("/reset-password/:token", resetPassword);

router.get("/auth-check", protectRoute, verifiedEmail, checkAuthStatus);

export default router;
