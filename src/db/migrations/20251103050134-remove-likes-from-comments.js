'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Comments', 'likes');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('Comments', 'likes', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
  }
};