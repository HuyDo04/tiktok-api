
const { Model, DataTypes } = require('sequelize');

class Livestream extends Model {
  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'hostId', as: 'host' });
  }
}

module.exports = (sequelize) => {
  Livestream.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('live', 'ended'),
        defaultValue: 'live',
      },
      hostId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      startedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      endedAt: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: 'Livestream',
      tableName: 'livestreams',
      timestamps: true,
    }
  );

  return Livestream;
};
