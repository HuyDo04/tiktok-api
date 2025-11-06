'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('posts', 'content', {
      type: Sequelize.TEXT('long'),
      allowNull: false,
    });

    await queryInterface.addColumn('posts', 'status', {
      type: Sequelize.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft',
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('posts', 'content');
    await queryInterface.removeColumn('posts', 'status');
  },
};
