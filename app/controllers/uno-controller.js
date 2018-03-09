"use strict"

const express = require("express");
const router = express.Router();
const db = require("../models");
const Values = db.Values;
const Colors = db.Colors;
const Cards = db.Cards;
const Deck = db.Deck;
const Enum = require("enum");
const Shuffle = require("shuffle");

const utilities = {
	// Returns a JSON object containing the error summary and error message
	createErrorMessageJSON: (errorSummary, errorObj) => {
		return {
			errorSummary: errorSummary,
			errorMessage: errorObj.message
		};
	},
	// Returns an array of Create promises
	createCards: (qty, card, value, color, colorValue, valueId, colorId) => {
		let result = [];

		for(let i=0; i<qty; i++) {
			let promise = Cards.create({
				card: card,
				value: value,
				color: color,
				colorValue: colorValue,
				valueId: valueId,
				cardId: colorId
			});
		}

		return result;
	}
}

// Initializes game
router.get("/game/initialize", (req, res) => {
	const colors = null;

	// Start by deleting rows from the Deck and Cards table
	Deck.destroy({
		where: {},  // We want all the rows gone!
		runcate: true
	})
	.then((results) => {
		Cards.destroy({
				where: {},  // We want all the rows gone!
				runcate: true
		})
		.then((results) => {
			// Now, populate the Cards table by creating rows based on the Colors and Values tables
			Colors.findAll()
			.then((colors) => {
				
				if(colors.length === 0) {
					throw new Error("No rows found in Colors table.");
				}
				
				colors = colors;

				Values.findAll()
				.then((values) => {

					if(values.length === 0) {
						throw new Error("No rows found in Values table.");
					}

					let createPromises = [];

					let wildsCreated = false;
					let wildsDrawFourCreated = false;

					// For each color create cards as follows
					// 76x numbers (0-9, all colors)
	    		// 8x draw two (2x each color)
	    		// 8x reverse (2x each color)
	    		// 8x skip (2x each color)
	    		// 4x wild
	    		// 4x wild draw four

	    		// We are inserting a whole bunch of rows here, so we will store
					// each create promise and then return a Promise.all
					for(let i=0; i < colors.length; i++) {
						for(let j=0; j < values.length; j++) {
							let promise = null;
						
							if(Number(values[j].value) >= 1 && Number(values[j].value <= 12)) {
								
								// Create 2 cards of 0 - 9 for each color
								createPromises.push.apply(createPromises, utilities.createCards(2, values[j].card, values[j].value, colors[i].color, colors[i].colorValue, values[j].id, colors[i].id));

							} else if(Number(values[j].value) === 13 && wildsCreated === false) {
								
								// Create 4 cards each of WILD with no color designation
								createPromises.push.apply(createPromises, utilities.createCards(4, values[j].card, values[j].value, null, null, values[j].id, null));

								wildsCreated = true;

							} else if(Number(values[j].value) === 14 && wildsDrawFourCreated === false) {
								
								// Create 4 cards each of WILD with no color designation
								createPromises.push.apply(createPromises, utilities.createCards(4, values[j].card, values[j].value, null, null, values[j].id, null));

								wildsDrawFourCreated = true;
							} 
							else if(Number(values[j].value) === 0){
								
								// Create 1 zero card per color
								createPromises.push.apply(createPromises, utilities.createCards(1, values[j].card, values[j].value, colors[i].color, colors[i].colorValue, values[j].id, colors[i].id));
							
							} else {
								// Skip anything else
								continue;
							}
						}
					}

					return Promise.all(createPromises);
				})
				.then((results) => {
					console.log("Cards table populated.");

					res.status(200).json("OK");
				})
				.catch((error) => {
					res.status(500).json(utilities.createErrorMessageJSON("Error encountered while populating Cards table", error));
				});
			})
			.catch((error) => {
				res.status(500).json(utilities.createErrorMessageJSON("Error encountered while extracting from Colors table", error));
			});
		})
		.catch((error) => {
			res.status(500).json(utilities.createErrorMessageJSON("Error encountered while attempting to delete rows from Cards table", error));
		});
	})
	.catch((error) => {
		res.status(500).json(utilities.createErrorMessageJSON("Error encountered while attempting to delete rows from Deck table", error));
	});
});

// Creates a new shuffled deck
router.get("/game/create-deck", (req, res) => {
	// Get all the cards from the database
	Cards.findAll()
	.then((cards) => {
		
		if(cards.length === 0) {
			throw new Error("No cards found in Cards table.  Have you run initialization?");
		}

		// Shuffle the cards
		const deck = Shuffle.shuffle({deck: cards});

		// Since this is a new deckm, let's delete all the rows currently in the decks table
		Deck.destroy({
			where: {},  // We want all the rows gone!
			truncate: true
		})
		.then((result) => {
			// Store the shuffled deck in the database
			let createPromises = [];

			for(let i=0; i<deck.cards.length; i++) {
				let promise = Deck.create({
					card: deck.cards[i].card,
					value: deck.cards[i].value,
					color: deck.cards[i].color,
					colorValue: deck.cards[i].colorValue
				})

				createPromises.push(promise);
			}

			return Promise.all(createPromises);
		})
		.then((results) => {
			res.status(200).json(deck);
		})
	}).catch((error) => {
		res.status(500).json(utilities.createErrorMessageJSON("Error encountered while creating deck.",error));
	});
});

// Returns the top card from the deck
router.get("/game/get-card", (req, res) => {
	Deck.findAll({
		limit: 1
	})
	.then((results) => {
		res.status(200).json(results);
	})
	.catch((error) => {
		res.status(500).json(utilities.createErrorMessageJSON("Error encountered while getting the top card from the deck", error));
	})
});

// Draws cards for the provided player
router.get("/game/draw-cards/:playerId/:total", (req, res) => {
	let drawnCards = {};

	// Start by drawing cards from the deck
	Deck.findAll({
		limit: Number(req.params.total) // <- Watch out for this!, the request params are strings!!!
	})
	.then((results) => {
		// Store the drawn cards
		drawnCards = results;

		// Now, we have to store these cards into the users Hand table

		res.status(200).json(results);
	})
	.catch((error) => {
		res.status(500).json(utilities.createErrorMessageJSON("Error encountered while drawing cards from deck", error));
	});
});

// Returns the current deck
router.get("/game/get-deck", (req, res) => {
	Deck.findAll()
	.then((results) => {
		res.status(200).json(results);
	})
	.catch((error) => {
		res.status(500).json(utilities.createErrorMessageJSON("Error encountered while extracting deck", error));
	});
});

module.exports = router;