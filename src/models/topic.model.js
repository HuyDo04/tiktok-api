module.exports = (sequelize, DataTypes) => {
    const Topic = sequelize.define("Topic", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: {
        type: DataTypes.STRING,
        unique: true,  
      },
      slug: {
        type: DataTypes.STRING,
        unique: true,  
      },
      description: DataTypes.TEXT,
      icon: DataTypes.STRING,
      postCount: DataTypes.INTEGER,
      createdAt: DataTypes.DATE,
    }, {
      tableName: "topics",
      timestamps: false,
    });
  
    Topic.associate = (models) => {
      Topic.hasMany(models.Post, { foreignKey: "topicId", as: "posts" });
    };
  
    return Topic;
  };
  