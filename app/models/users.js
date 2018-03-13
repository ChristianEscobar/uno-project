module.exports = function(sequelize, DataTypes) {
    const Users = sequelize.define("Users", {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      totalWins: {
        type:DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      totalLosses: {
        type:DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isPlaying: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isTurn: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      hasDrawn: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    });

    return Users;
  };