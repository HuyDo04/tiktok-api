const express = require("express");
const router = express.Router();
const meController = require("@/controllers/auth.controller");
const checkAuth = require("@/middleware/checkAuth")

router.get("/",checkAuth, meController.getCurrentUser);

module.exports = router;
