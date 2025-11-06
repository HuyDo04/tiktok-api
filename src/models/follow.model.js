'use strict';

module.exports = (sequelize, DataTypes) => {
  const Follow = sequelize.define('Follow', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    followerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    followingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isFriend: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false, 
    },
  }, {
    tableName: 'Follows',
    timestamps: true
  });

  Follow.associate = function(models) {
    Follow.belongsTo(models.User, { as: 'Follower', foreignKey: 'followerId' });
    Follow.belongsTo(models.User, { as: 'Following', foreignKey: 'followingId' });
  };

  return Follow;
};
