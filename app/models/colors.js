/*
const Enum = require("enum");

module.exports = new Enum({
	// Card colors
	
	"RED": 1,
	"GREEN": 2,
	"BLUE": 3,
	"YELLOW": 4
}, "Colors");
*/

module.exports = function(sequelize, DataTypes) {
	const Colors = sequelize.define("Colors", {
		color: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true
		},
		value: {
			type: DataTypes.INTEGER
		}
	})

	return Colors;
};