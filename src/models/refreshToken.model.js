'use strict';
module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      }
    },

    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    expired_at: DataTypes.DATE
    
  }, {
    tableName: 'refresh_tokens',
    timestamps: true
  });

  RefreshToken.associate = function(models) {
    // RefreshToken belongsTo Post
    // RefreshToken.belongsTo(models.User);
    RefreshToken.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
  };

  return RefreshToken;
};
