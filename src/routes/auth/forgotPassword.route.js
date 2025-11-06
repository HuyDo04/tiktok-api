const express = require("express");

const router = express.Router();

const authController = require("@/controllers/auth.controller")

router.post("/", authController.forgotPassword);

router.post("/verify-otp", authController.verifyOtp);

router.put("/reset-password", authController.resetPassword);

router.post("/resend-otp", authController.resendOtp);

module.exports = router