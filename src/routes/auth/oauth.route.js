'use strict';

const express = require('express');
const router = express.Router();
const oauthController = require('@/controllers/oauth.controller');

router.post('/google', oauthController.googleLogin);
router.post('/facebook', oauthController.facebookLogin);

module.exports = router;
