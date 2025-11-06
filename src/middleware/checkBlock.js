const { BlockedUser } = require("../models");

/**
 * Middleware để kiểm tra xem người xem (viewer) có bị chủ thể (subject) chặn hay không.
 * Middleware này chỉ áp dụng cho các route có dạng /:id, nơi :id là ID của subject.
 *
 * - Nếu subject đã block viewer -> trả về 403 Forbidden.
 * - Ngược lại -> cho phép đi tiếp.
 */
async function checkBlock(req, res, next) {
  // Lấy ID người xem từ token (nếu đã đăng nhập)
  const viewerId = req.user?.id;
  // Lấy ID chủ thể từ URL params
  const subjectId = req.params.id ? parseInt(req.params.id, 10) : null;

  // Bỏ qua nếu không có người xem, không có chủ thể, hoặc ID không hợp lệ
  if (!viewerId || !subjectId || isNaN(subjectId) || viewerId === subjectId) {
    return next();
  }

  try {
    // Kiểm tra xem chủ thể (subject) có đang chặn người xem (viewer) không
    const isBlocked = await BlockedUser.findOne({
      where: { blockerId: subjectId, blockedId: viewerId },
    });

    if (isBlocked) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập người dùng này." });
    }

    return next(); // Không bị chặn, cho phép đi tiếp
  } catch (error) {
    console.error("Lỗi tại middleware checkBlock:", error);
    return res.status(500).json({ message: "Lỗi máy chủ khi kiểm tra quyền truy cập." });
  }
}

module.exports = checkBlock;