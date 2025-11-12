'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Thay đổi cột 'content' để cho phép giá trị NULL
    await queryInterface.changeColumn('posts', 'content', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Hoàn tác: thay đổi cột 'content' để không cho phép giá trị NULL
    await queryInterface.changeColumn('posts', 'content', {
      type: Sequelize.TEXT('long'),
      allowNull: false,
    });
  }
};