'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('posts', 'excerpt');
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('posts', 'excerpt', {
      type: Sequelize.TEXT,
      allowNull: true, // Hoặc false tùy theo logic cũ của bạn
    });
  }
};
