module.exports = function(sequelize, DataTypes) {
	const Cards = sequelize.define("Cards", {
		value: {
			type: DataTypes.INTEGER
		},
		color: {
			type: DataTypes.STRING
		}
	});

	return Cards;
}