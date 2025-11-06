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
    }, {
      tableName: 'tags',
      timestamps: false,
    });
  
    Tag.associate = (models) => {
      Tag.belongsToMany(models.Post, {
        through: 'PostTags',
        foreignKey: 'tagId',
        otherKey: 'postId',
        as: 'posts',
      });
    };
  
    return Tag;
  };
  