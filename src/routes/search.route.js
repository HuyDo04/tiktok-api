const express = require('express');
const router = express.Router();
const searchController = require('@/controllers/search.controller');
const checkAuth = require("@/middleware/checkAuth");
const checkAuthOptional = require("@/middleware/checkAuthOptional");

// Định nghĩa route để tìm kiếm tổng hợp
// GET /api/search?q=keyword
router.get('/',
  checkAuthOptional, // Cho phép cả người dùng đã đăng nhập và chưa đăng nhập
  searchController.search,
);

// --- Routes cho Lịch sử tìm kiếm ---

// Lấy lịch sử tìm kiếm
router.get('/history', checkAuth, searchController.getHistory);

// Xóa toàn bộ lịch sử
router.delete('/history', checkAuth, searchController.clearHistory);

// Xóa một mục lịch sử cụ thể
router.delete('/history/:historyId', checkAuth, searchController.deleteHistory);

module.exports = router;