// Tag.js
module.exports = (sequelize, DataTypes) => {
    const Tag = sequelize.define('Tag', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        unique: true,
      },
      normalized_name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Có thể có hashtag chưa được phân loại
      }
    }, {
      tableName: 'tags',
      timestamps: false,
    });
  
    Tag.associate = (models) => {
      Tag.belongsToMany(models.Post, {
        through: 'post_tags',
        foreignKey: 'tagId',
        otherKey: 'postId',
        as: 'posts',
      });
      Tag.belongsTo(models.HashtagGroup, {
        foreignKey: 'groupId',
        as: 'group',
        allowNull: true,
      });
    };
  
    return Tag;
  };
  