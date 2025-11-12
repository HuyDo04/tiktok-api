'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tags', 'normalized_name', {
      type: Sequelize.STRING,
      allowNull: true, // Tạm thời cho phép null để cập nhật dữ liệu cũ
    });
    await queryInterface.addColumn('tags', 'groupId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'hashtag_groups',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Cập nhật dữ liệu cũ (nếu có)
    await queryInterface.sequelize.query(
      `UPDATE tags SET normalized_name = LOWER(REPLACE(name, ' ', '')) WHERE normalized_name IS NULL`
    );

    // Sau khi cập nhật, đổi lại thành NOT NULL
    await queryInterface.changeColumn('tags', 'normalized_name', {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tags', 'normalized_name');
    await queryInterface.removeColumn('tags', 'groupId');
  }
};
