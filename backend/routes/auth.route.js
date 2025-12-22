import express from "express";
import { forgotPassword, login, logout, resetPassword, signup, verifyAccount, verifyEmail } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify_email", verifyEmail);
router.post("/forgot_password", forgotPassword);
router.post("/email-verification/:token", verifyAccount);
router.post("/reset-password/:token", resetPassword);

export default router;
