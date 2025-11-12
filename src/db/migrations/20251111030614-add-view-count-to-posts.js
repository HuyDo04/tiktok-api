module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Posts', 'viewCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'view_count' // Tên cột thực tế trong cơ sở dữ liệu
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Posts', 'viewCount');
  }
};