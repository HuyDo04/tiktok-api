'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('chats', 'status', {
      type: Sequelize.ENUM('pending', 'active'),
      allowNull: false,
      defaultValue: 'active',
      after: 'type' // Đặt sau cột 'type' cho dễ nhìn
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('chats', 'status');
    // Nếu dùng PostgreSQL, bạn cần thêm lệnh xóa ENUM type
    // await queryInterface.sequelize.query('DROP TYPE "enum_chats_status";');
  }
};
