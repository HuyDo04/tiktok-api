const authService = require("@/service/auth.service");
const { verifyToken } = require("@/utils/jwt");

/**
 * Middleware xác thực tùy chọn.
 * - Nếu có token hợp lệ, nó sẽ giải mã và gán `req.user`.
 * - Nếu không có token hoặc token không hợp lệ, nó sẽ bỏ qua và cho phép request đi tiếp.
 */
const checkAuthOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (token) {
      const payload = verifyToken(token);
      if (payload && payload.data?.userId) {
        // Chỉ gán user nếu tìm thấy, tránh lỗi nếu user đã bị xóa
        const user = await authService.getById(payload.data.userId);
        if (user) req.user = user;
      }
    }
  } catch (error) {
    // Bỏ qua lỗi token (ví dụ: hết hạn) và coi như người dùng chưa đăng nhập
  }
  return next();
};

module.exports = checkAuthOptional;