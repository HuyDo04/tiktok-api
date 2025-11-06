'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'provider', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'email',
    });

    await queryInterface.addColumn('users', 'providerId', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addIndex('users', ['provider', 'providerId'], {
      name: 'users_provider_providerId_idx',
      unique: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('users', 'users_provider_providerId_idx');
    await queryInterface.removeColumn('users', 'providerId');
    await queryInterface.removeColumn('users', 'provider');
  },
};