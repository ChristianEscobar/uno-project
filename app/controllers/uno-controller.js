const express = require("express");
const router = express.Router();
const db = require("../models");
const Values = db.Values;
const Colors = db.Colors;
const Cards = db.Cards;
const Enum = require("enum");
const Shuffle = require("shuffle");

router.get("/game/create-deck", (req, res) => {
	Cards.findAll()
	.then((cards) => {
		const deck = Shuffle.shuffle({deck: cards});

		res.status(200).json(deck);
	}).catch((error) => {
		console.error(error);
	});
});

module.exports = router;