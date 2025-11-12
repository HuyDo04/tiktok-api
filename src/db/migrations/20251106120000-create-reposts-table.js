'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Reposts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users', // Tên bảng trong DB
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Nếu user bị xóa, repost cũng bị xóa
      },
      postId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'posts', // Tên bảng trong DB
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Nếu post gốc bị xóa, repost cũng bị xóa
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Thêm ràng buộc unique để một user không thể repost cùng 1 post nhiều lần
    await queryInterface.addConstraint('Reposts', {
      fields: ['userId', 'postId'],
      type: 'unique',
      name: 'unique_user_post_repost'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Reposts');
  }
};