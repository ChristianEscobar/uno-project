"use strict"

const express = require("express");
const router = express.Router();
const db = require("../models");
const Values = db.Values;
const Colors = db.Colors;
const Cards = db.Cards;
const Deck = db.Deck;
const Users = db.Users;
const Discard = db.Discard;
const Hands = db.Hands;
const Enum = require("enum");
const Shuffle = require("shuffle");
const utilities = require("./utils/utilities");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

// Sets up a new game
router.get("/game/new-game", (req, res) => {
	let colorValues = null;

	let populateCardsTable = false;

	// Start by checking if enough players have joined the game
	Users.findAll()
	.then((results) => {
		if(results === null || results.length < 2) {
			throw new Error("Not enough players have joined");
		}

		return Promise.resolve(true);
	})
	.then(() => {
		// Check if the Cards table needs to be populated
		return Cards.findAll()
	})
	.then((results) => {
		if(results === null || results.length === 0) {
			populateCardsTable = true;
		} else {
			populateCardsTable = false;
		}

		return Promise.resolve(true);
	})
	.then((results) => {
		// Start by deleting rows from the Deck
		Deck.destroy({
			where: {},  // We want all the rows gone!
			truncate: true
		});
	})
	.then((results) => {
		// Pull data from Colors table
		return Colors.findAll();	
	})
	.then((colors) => {
		if(colors === null || colors.length === 0) {
			throw new Error("No rows found in Colors table.  Have you executed seeder script?");
		}
				
		colorValues = colors;

		// Pull data from the Values table
		return Values.findAll()
	})
	.then((values) => {
		if(values === null || values.length === 0) {
			throw new Error("No rows found in Values table.  Have you executed seeder script?");
		}

		// Now, populate the Cards table if necessary
		// For each color create cards as follows
		// 76x numbers (0-9, all colors)
		// 8x draw two (2x each color)
		// 8x reverse (2x each color)
		// 8x skip (2x each color)
		// 4x wild
		// 4x wild draw four
		if(populateCardsTable === true) {
			const createPromises = [];

			let wildsCreated = false;
			let wildsDrawFourCreated = false;

			// We are inserting a whole bunch of rows here, so we will store
			// each create promise and then return a Promise.all
		
			for(let i=0; i < colorValues.length; i++) {
				for(let j=0; j < values.length; j++) {
					let promise = null;
				
					if(Number(values[j].value) >= 1 && Number(values[j].value <= 12)) {
						
						// Create 2 cards of 0 - 9 for each color

						// Create image name based on value
						let smallImageName = "";
						let largeImageName = "";

						switch(values[j].value) {
							case 10: {
								smallImageName = colorValues[i].color + "_picker.png";
								largeImageName = colorValues[i].color + "_picker_large.png";
								break;
							}
							case 11: {
								smallImageName = colorValues[i].color + "_reverse.png";
								largeImageName = colorValues[i].color + "_reverse_large.png";
								break;
							}
							case 12: {
								smallImageName = colorValues[i].color + "_skip.png";
								largeImageName = colorValues[i].color + "_skip_large.png";
								break;
							}
							default: {
								smallImageName = colorValues[i].color + "_" + values[j].value + ".png";
								largeImageName = colorValues[i].color + "_" + values[j].value + "_large.png";
							}
						}

						createPromises.push.apply(createPromises, utilities.createCards(2, smallImageName, largeImageName, values[j].id, colorValues[i].id));

					} else if(Number(values[j].value) === 13 && wildsCreated === false) {
						
						// Create 4 cards each of WILD with no color designation
						const smallImageName = "wild_color_changer.png";
						const largeImageName = "wild_color_changer_large.png";

						createPromises.push.apply(createPromises, utilities.createCards(4, smallImageName, largeImageName, values[j].id, null));

						wildsCreated = true;

					} else if(Number(values[j].value) === 14 && wildsDrawFourCreated === false) {
						
						// Create 4 cards each of WILD with no color designation
						const smallImageName = "wild_pick_four.png";
						const largeImageName = "wild_pick_four_large.png";

						createPromises.push.apply(createPromises, utilities.createCards(4, smallImageName, largeImageName, values[j].id, null));

						wildsDrawFourCreated = true;
					} 
					else if(Number(values[j].value) === 0){
						
						// Create 1 zero card per color
						const smallImageName = colorValues[i].color + "_" + values[j].value + ".png";
						const largeImageName = colorValues[i].color + "_" + values[j].value + "_large.png";

						createPromises.push.apply(createPromises, utilities.createCards(1, smallImageName, largeImageName, values[j].id, colorValues[i].id));
					
					} else {
						// Skip anything else
						continue;
					}
				}
			}
			return Promise.all(createPromises);
		} else {
			return Promise.resolve(true);
		}
	})
	.then((results) => {
		// Now, create a new shuffled deck
		return utilities.newShuffledDeck();
	})
	.then((results) => {
		// Deal 7 cards to player 1, this should be more dynamic instead of hard coding
		return utilities.dealCards(1, utilities.drawCards, utilities.addCardsToPlayerHand, utilities.deleteFromDeck);
	})
	.then((results) => {
		// Deal 7 cards to player 2, this should be more dynamic instead of hard coding
		return utilities.dealCards(2, utilities.drawCards, utilities.addCardsToPlayerHand, utilities.deleteFromDeck);
	})
	.then((results) => {
		// Draw one card from the top of the deck
		return utilities.drawCards(1);
	})
	.then((results) => {
		// Place the card on the discard pile
		return utilities.addToDiscardPile(results[0].cardId);
	})
	.then((results) => {
		// Delete the top most card from the deck since it is now on the discard pile
		const cardIds = [];
		cardIds.push(results.cardId);

		return utilities.deleteFromDeck(cardIds);
	})
	.then((results) => {
		res.status(200).json("OK");
	})
	.catch((error) => res.status(500).json(utilities.createErrorMessageJSON("Error encountered while attempting to setup a new game.", error)));
});

router.get("/game/player-info/:playerId", (req, res) => {
	Users.findAll({
		where: {id: req.params.playerId}
	})
	.then((results) => {
		res.status(200).json(results);
	})
	.catch((error) => utilities.createErrorMessageJSON("Error encountered while creating new player.", error));
});

router.post("/game/new-player/:name", (req, res) => {
	let responseObj = 
	{
		userId: -1
	};

	Users.findAll()
	.then((results) => {
		// No users are playing to we can continue
		if(results.length < 2) {
			return Users.create({
				name: req.params.name,
				totalWins: 0,
				totalLosses: 0,
				isPlaying: true
			});
		} else {
			res.status(200).json(responseObj);
		}
	})
	.then((results) => {
		res.status(200).json(results);
	})
	.catch((error) => utilities.createErrorMessageJSON("Error encountered while creating new player.", error));
});


// Creates a new shuffled deck
router.get("/game/create-deck", (req, res) => {
	utilities.newShuffledDeck()
	.then((results) => {
		res.status(200).json(results);
	})
	.catch((error) => res.status(500).json(utilities.createErrorMessageJSON("Error encountered while creating deck.",error)));
});

// Returns the top card from the deck NOT USED for now.
/*
router.get("/game/draw-card", (req, res) => {

	// Extract the top most card
	Deck.findAll({
		limit: 1
	})
	.then((results) => {

		if(results.length === 0) {
			throw new Error("No rows found in Deck table.");
		}
		// Now extract the card from the Cards table
		Cards.findAll({
			where: {
				id: results[0].cardId
			}
		})
		.then((card) => {
			res.status(200).json(card);
		})
	})
	.catch((error) => {
		res.status(500).json(utilities.createErrorMessageJSON("Error encountered while getting the top card from the deck", error));
	})
});
*/

// Discards a card from the specified players hand and places on the discard pile
router.post("/game/discard/:playerId/:cardId", (req, res) => {
	utilities.removeFromHandAndAddToDiscard(req.params.playerId, req.params.cardId)
	.then((results) => {
		res.status(200).json(results);
	})
	.catch((error) => res.status(500).json(utilities.createErrorMessageJSON("Error encountered while discarding card from player", error)));
});

// Draws cards for the provided player
router.get("/game/draw-cards/:playerId/:total", (req, res) => {
	
	// Start by drawing cards from the deck
	Deck.findAll({
		limit: Number(req.params.total) // <- Watch out for this!, the request params are strings!!!
	})
	.then((results) => {

		if(results.length === 0) {
			throw new Error("No rows found in Deck table.");
		}

		// Store the drawn cards
		drawnCards = results;

		// Now, we have to store these cards into the users Hand table

		res.status(200).json(results);
	})
	.catch((error) => {
		res.status(500).json(utilities.createErrorMessageJSON("Error encountered while drawing cards from deck", error));
	});
	
});

//TEST route
router.get("/game/test", (req, res) => {
	
	Values.findAll({
		where: {
			value: {
				[Op.in]: [10,11,12,13,14]
			}
		},
		include: [{
			model: Cards
		}]
	})
	.then((results) => {
		res.status(200).json(results);
	})
	.catch((error) => {
		console.log(error);
		res.status(500).json(error);
	})

});

router.get("/game/get-hand/:playerId", (req, res) => {
	Hands.findAll({
		where: {
			userId: req.params.playerId
		}
	})
	.then((hand) => {
		if(hand === null || hand.length === 0) {
			throw new Error("No cards found for specified player.  Make sure cards have been dealt.");
		}

		res.status(200).json(hand);
	})
	.catch((error) => {
		res.status(500).json(utilities.createErrorMessageJSON("Error encountered while retrieving players hand", error));
	})
});

// Returns the current deck
router.get("/game/get-deck", (req, res) => {
	Deck.findAll()
	.then((deck) => {
		if(deck === null || deck.length === 0) {
			throw new Error("No cards found in deck.  Make sure a deck has been setup.");
		}

		res.status(200).json(deck);
	})
	.catch((error) => {
		res.status(500).json(utilities.createErrorMessageJSON("Error encountered while retrieving deck", error));
	})
});

// Returns true if it is the turn of the specified player.  False otherwise.
router.get("/game/is-playerturn/:playerId", (req, res) => {

});

module.exports = router;