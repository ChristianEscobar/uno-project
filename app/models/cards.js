module.exports = function(sequelize, DataTypes) {
	const Cards = sequelize.define("Cards", {
		card: {
			type: DataTypes.STRING,
			allowNull: false
		},
		value: {
			type: DataTypes.INTEGER,
			allowNull: false
		},
		color: {
			type: DataTypes.STRING,
			allowNull: true
		},
		colorValue: {
			type: DataTypes.INTEGER,
			allowNull: true
		}
	});

	return Cards;
}