'use strict';
module.exports = (sequelize, DataTypes) => {
  const Agent = sequelize.define('Agent', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pattern: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    systemPrompt: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'agents',
  });

  Agent.associate = function(models) {
    // associations can be defined here
  };

  return Agent;
};