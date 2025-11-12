const searchService = require('@/service/search.service');
const searchHistoryService = require('@/service/searchHistory.service');

exports.search = async (req, res) => {
  try {
    const { q } = req.query; // Lấy từ khóa tìm kiếm từ query param `q`
    const currentUserId = req.user ? req.user.id : null;

    if (!q) {
      return res.status(400).json({ message: 'Từ khóa tìm kiếm là bắt buộc.' });
    }

    // Thêm vào lịch sử tìm kiếm (không cần đợi)
    if (currentUserId) {
      searchHistoryService.addSearchHistory(currentUserId, q);
    }

    const results = await searchService.searchAll(q, currentUserId);

    res.status(200).json(results);
  } catch (error) {
    console.error('Lỗi khi thực hiện tìm kiếm:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tìm kiếm.', error: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await searchHistoryService.getSearchHistory(userId);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy lịch sử tìm kiếm.', error: error.message });
  }
};

exports.deleteHistory = async (req, res) => {
  try {
    const { historyId } = req.params;
    const userId = req.user.id;
    const result = await searchHistoryService.deleteSearchHistory(historyId, userId);
    if (result === 0) {
      return res.status(404).json({ message: 'Không tìm thấy mục lịch sử hoặc bạn không có quyền xóa.' });
    }
    res.status(200).json({ message: 'Đã xóa mục lịch sử.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa lịch sử tìm kiếm.', error: error.message });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    await searchHistoryService.clearAllSearchHistory(userId);
    res.status(200).json({ message: 'Đã xóa toàn bộ lịch sử tìm kiếm.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa toàn bộ lịch sử tìm kiếm.', error: error.message });
  }
};