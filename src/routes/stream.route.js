
const express = require('express');
const router = express.Router();
const streamController = require('../controllers/stream.controller');
const checkAuth = require('../middleware/checkAuth');

// @route   POST /api/streams/create
// @desc    Create a new livestream
// @access  Private
router.post('/create', checkAuth, streamController.createStream);

// @route   GET /api/streams
// @desc    Get all live streams
// @access  Public
router.get('/', streamController.getLiveStreams);

// @route   GET /api/streams/:id
// @desc    Get stream details
// @access  Public
router.get('/:id', streamController.getStreamById);

// @route   POST /api/streams/:id/end
// @desc    End a livestream
// @access  Private (Host only)
router.post('/:id/end', checkAuth, streamController.endStream);

module.exports = router;
