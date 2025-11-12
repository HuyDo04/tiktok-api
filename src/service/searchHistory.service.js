const { SearchHistory } = require('@/models');

const searchHistoryService = {
  async addSearchHistory(userId, query) {
    if (!userId || !query) return;

    // Xóa các bản ghi cũ có cùng query để đảm bảo bản ghi mới nhất luôn ở trên cùng
    await SearchHistory.destroy({
      where: { userId, query }
    });

    const history = await SearchHistory.create({ userId, query });
    return history;
  },

  async getSearchHistory(userId, limit = 10) {
    return await SearchHistory.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: limit,
      attributes: ['id', 'query', 'createdAt']
    });
  },

  async deleteSearchHistory(historyId, userId) {
    return await SearchHistory.destroy({
      where: {
        id: historyId,
        userId: userId
      }
    });
  },

  /**
   * Xóa toàn bộ lịch sử tìm kiếm của người dùng.
   * @param {number} userId - ID của người dùng.
   */
  async clearAllSearchHistory(userId) {
    return await SearchHistory.destroy({ where: { userId } });
  }
};

module.exports = searchHistoryService;