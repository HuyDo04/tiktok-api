'use strict';
module.exports = {
  async up (queryInterface, Sequelize) {
    const groups = [
      'Ẩm thực', 'Thể thao', 'Công nghệ', 'Đời sống', 'Giải trí',
      'Giáo dục', 'Kinh doanh', 'Thời trang', 'Sức khỏe'
    ];
    const now = new Date();
    await queryInterface.bulkInsert('hashtag_groups', groups.map(name => ({
      name: name,
      createdAt: now,
      updatedAt: now
    })), {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('hashtag_groups', null, {});
  }
};
