'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Follows', 'isFriend', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'followingId' // Đặt cột này sau cột followingId cho dễ nhìn
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Follows', 'isFriend');
  }
};