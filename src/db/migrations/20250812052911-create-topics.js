'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('topics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        unique: true, // Đảm bảo không trùng tên topic (nếu bạn muốn)
      },
      slug: {
        type: Sequelize.STRING,
        unique: true, // Slug là duy nhất để gán vào URL
      },
      description: {
        type: Sequelize.TEXT,
      },
      icon: {
        type: Sequelize.STRING,
      },
      postCount: {
        type: Sequelize.INTEGER,
      },
      createdAt: {
        type: Sequelize.DATE,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('topics');
  }
};
