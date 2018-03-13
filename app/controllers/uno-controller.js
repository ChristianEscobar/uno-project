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
router.post("/game/new-game", (req, res) => {
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
		return utilities.dealCards(1);
	})
	.then((results) => {
		// Deal 7 cards to player 2, this should be more dynamic instead of hard coding
		return utilities.dealCards(2);
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
		// Set player 1 as next player
		return utilities.setPlayerTurn(1, true);
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
router.post("/game/create-deck", (req, res) => {
	utilities.newShuffledDeck()
	.then((results) => {
		res.status(200).json(results);
	})
	.catch((error) => res.status(500).json(utilities.createErrorMessageJSON("Error encountered while creating deck.",error)));
});

// Adds one card to the player's hand
router.post("/game/draw/:playerId", (req, res) => {
	// Start by checking if it is the player's turn
	utilities.isPlayerTurn(req.params.playerId)
	.then((user) => {
		if(user[0].isTurn === false) {
			throw new Error("Not your turn yet");
		}

		// Now check if the user has already drawn a card
		return utilities.getHasUserDrawn(req.params.playerId)
	})
	.then((drawn) => {
		if(drawn === true) {
			throw new Error("Player has already drawn a card");
		}

		// Draw one card
		return utilities.drawCards(1);
	})
	.then((card) => {
		// Add card to player's hand
		return utilities.addCardsToPlayerHand(req.params.playerId, card);
	})
	.then((results) => {
		// Set hasDrawn to true
		return utilities.setHasUserDrawn(req.params.playerId, true);
	})
	.then((results) => {
		// Now, check if the deck has to be shuffled
		return utilities.totalCardsOnDeck();
	})
	.then((results) => {
		// Create a new deck if there are no cards left
		if(results[0].dataValues.rows === 0) {
			return utilities.newShuffledDeck()
			.then((results) => {
				return utilities.removePlayerCardsFromDeck();
			})
		}
	})
	.then((results) => {
		res.status(200).json("OK");
	})
	.catch((error) => res.status(500).json(utilities.createErrorMessageJSON("Error encountered while drawing card for player", error)));

});

// Discards a card from the specified players hand and places on the discard pile
router.post("/game/discard/:playerId/:cardId", (req, res) => {
	let nextPlayerId = null;

	// Start by getting the next player
	utilities.getNextPlayer()
	.then((results) => {
		 nextPlayerId = results[0].id;

		// Check if it is this player's turn
		return utilities.isPlayerTurn(req.params.playerId)
	})
	.then((user) => {
		if(user[0].isTurn === false) {
			throw new Error("Not your turn yet");
		}

		// Is the card being discarded a WILD or WILD DRAW FOUR
		return utilities.isWildCard(req.params.cardId);
	})
	.then((results) => {
		let resultObj = {
			needToChooseColor: false
		}

		// WILD cards will result in a response of needToChooseColor: true
		if(results.isWildCard === true) {
			resultObj.needToChooseColor = true;

			res.status(200).json(resultObj);
		} else if(results.isWildDrawFour === true) {

			resultObj.needToChooseColor = true;

			// Now, give the next player 4 cards
			utilities.drawCards(4)
			.then((cards) => {
				return utilities.addCardsToPlayerHand(nextPlayerId, cards);
			})
			.then((results) => {
				res.status(200).json(resultObj);
			})
		}

		// Handle card matching, along with ACTION cards
		return utilities.doesCardMatch(req.params.cardId);

	})
	.then((results) => {
		res.status(200).json(results);
	})
	.catch((error) => res.status(500).json(utilities.createErrorMessageJSON("Error encountered while discarding card for player", error)));
});

// Route for TESTING ONLY!
router.get("/game/test", (req, res) => {
	return utilities.test()
	.then((results) => {
		res.status(200).json(results);
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
	.catch((error) => res.status(500).json(utilities.createErrorMessageJSON("Error encountered while retrieving players hand", error)));
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
	.catch((error) => res.status(500).json(utilities.createErrorMessageJSON("Error encountered while retrieving deck", error)));
});

// Returns true if it is the turn of the specified player.  False otherwise.
router.get("/game/is-playerturn/:playerId", (req, res) => {
	utilities.isPlayerTurn(req.params.playerId)
	.then((results) => {
		res.status(200).json(results[0]);
	})
	.catch((error) => res.status(500).json(utilities.createErrorMessageJSON("Error encountered while checking for player turn", error)));
});

// Passes the player's turn and sets it to the next player
router.post("/game/pass/:playerId", (req, res) => {
	let nextPlayerId = null;

	// Start by checking if it is the player's turn
	utilities.isPlayerTurn(req.params.playerId)
	.then((user) => {
		if(user[0].isTurn === false) {
			throw new Error("Not your turn yet");
		}

		// Grab the next player
		return utilities.getNextPlayer()
	})
	.then((results) => {
		 nextPlayerId = results[0].id;

		// Pass the player's turn
		return utilities.setPlayerTurn(req.params.playerId, false)
	})
	.then((results) => {
		return utilities.setPlayerTurn(nextPlayerId, true);
	})
	.then((results) => {
		res.status(200).json("OK");
	})
	.catch((error) => res.status(500).json(utilities.createErrorMessageJSON("Error encountered while passing player turn", error)));
});

// Changes the color of a WILD card currently on top of discard pile
router.post("/game/change-color/:colorName", (req, res) => {
	let cardObj = null;

	// Check if card on top is a WILD card
	utilities.topCardOnDiscard()
	.then((card) => {
		cardObj = card;

		return utilities.isWildCard(card[0].cardId)
	})
	.then((results) => {
		if(results.isWildCard === false && results.isWildDrawFour === false) {
			throw new Error("Only WILD cards can have their color changed.");
		}

		// NOTE, we need to create card images to handle WILD card color choosing
		return utilities.setWildCardColor(cardObj[0].cardId, req.params.colorName);
	})
	.then((results) => {
		res.status(200).json("OK");
	})
	.catch((error) => res.status(500).json(utilities.createErrorMessageJSON("Error encountered while changing color for WILD card", error)));
});

module.exports = router;