'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Thay đổi cột 'type' để thêm giá trị 'new_friend' vào ENUM
    await queryInterface.changeColumn('Notifications', 'type', { // Thêm cả mention_post
      type: Sequelize.ENUM('like_post', 'like_comment', 'new_follower', 'new_friend', 'mention_post','new_comment','mention_comment', 'repost'),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Logic để rollback (phức tạp hơn với ENUM, nhưng đây là cách đơn giản nhất)
    // Chú ý: Việc rollback có thể gây mất dữ liệu nếu đã có thông báo 'new_friend' hoặc 'mention_post'
    await queryInterface.changeColumn('Notifications', 'type', {
      type: Sequelize.ENUM('like_post', 'like_comment', 'new_follower', 'new_friend','mention_post','new_comment','mention_comment'),
      allowNull: false,
    });
  }
};