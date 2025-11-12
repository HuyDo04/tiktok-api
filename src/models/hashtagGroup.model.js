// hashtagGroup.model.js
module.exports = (sequelize, DataTypes) => {
    const HashtagGroup = sequelize.define('HashtagGroup', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      description: DataTypes.TEXT,
    }, {
      tableName: 'hashtag_groups',
      timestamps: true,
    });
  
    HashtagGroup.associate = (models) => {
      HashtagGroup.hasMany(models.Tag, { foreignKey: 'groupId', as: 'tags' });
    };
  
    return HashtagGroup;
  };