const express = require("express");
const router = express.Router();
const refreshToken = require("@/controllers/auth.controller");

router.post("/", refreshToken.refreshToken);

module.exports = router;
