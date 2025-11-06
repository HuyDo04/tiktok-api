const express = require("express");

const router = express.Router();

const authController = require("@/controllers/auth.controller")
const checkAuth = require("@/middleware/checkAuth")

router.post("/", checkAuth, authController.changePassword)

module.exports = router