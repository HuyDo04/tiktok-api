'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CommentMentions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      commentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'comments', // Tên bảng trong DB
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users', // Tên bảng trong DB
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addConstraint('CommentMentions', {
      fields: ['commentId', 'userId'],
      type: 'unique',
      name: 'unique_comment_user_mention'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CommentMentions');
  }
};