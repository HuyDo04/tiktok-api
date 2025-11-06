module.exports = (sequelize, DataTypes) => {
    const Session = sequelize.define("Session", {
      sid: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      data: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },{
      tableName: 'sessions',
      timestamps: true
    });
  
    return Session;
  };
