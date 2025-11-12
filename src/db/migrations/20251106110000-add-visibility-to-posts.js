'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('posts', 'visibility', {
      type: Sequelize.ENUM('public', 'friends', 'private'),
      allowNull: false,
      defaultValue: 'public',
      after: 'publishedAt' // Đặt sau cột publishedAt cho dễ nhìn
    });

    // Thêm index để tối ưu truy vấn
    await queryInterface.addIndex('posts', ['visibility']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('posts', ['visibility']);
    await queryInterface.removeColumn('posts', 'visibility');
    // Cần xóa cả kiểu ENUM trong PostgreSQL, nhưng với MySQL/MariaDB thì không cần
    // await queryInterface.sequelize.query('DROP TYPE "enum_posts_visibility";');
  }
};