'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Thay đổi cột 'type' để thêm giá trị 'new_friend' vào ENUM
    await queryInterface.changeColumn('Notifications', 'type', {
      type: Sequelize.ENUM('like_post', 'like_comment', 'new_follower', 'new_friend'),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Logic để rollback (phức tạp hơn với ENUM, nhưng đây là cách đơn giản nhất)
    // Chú ý: Việc rollback có thể gây mất dữ liệu nếu đã có thông báo 'new_friend'
    await queryInterface.changeColumn('Notifications', 'type', {
      type: Sequelize.ENUM('like_post', 'like_comment', 'new_follower'),
      allowNull: false,
    });
  }
};