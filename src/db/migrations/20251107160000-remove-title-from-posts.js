'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Posts', 'title');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Posts', 'title', {
      type: Sequelize.STRING,
    });
  }
};
