const express = require("express");
const router = express.Router();
const logoutController = require("@/controllers/auth.controller");

router.post("/", logoutController.logout);

module.exports = router;
