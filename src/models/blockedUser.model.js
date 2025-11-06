'use strict';

module.exports = (sequelize, DataTypes) => {
  const BlockedUser = sequelize.define('BlockedUser', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    blockerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    blockedId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'BlockedUsers',
    timestamps: true
  });

  BlockedUser.associate = function(models) {
    BlockedUser.belongsTo(models.User, { as: 'Blocker', foreignKey: 'blockerId' });
    BlockedUser.belongsTo(models.User, { as: 'Blocked', foreignKey: 'blockedId' });
  };

  return BlockedUser;
};
