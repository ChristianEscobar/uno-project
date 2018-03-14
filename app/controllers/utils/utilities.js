const db = require("../../models");
const Values = db.Values;
const Colors = db.Colors;
const Cards = db.Cards;
const Deck = db.Deck;
const Users = db.Users;
const Discard = db.Discard;
const Hands = db.Hands;
const Enum = require("enum");
const Shuffle = require("shuffle");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;


// Object used to hold various utility functions
const utilities = {
	// Returns a JSON object containing the error summary and error message
	createErrorMessageJSON: (errorSummary, errorObj) => {
		console.log("===> createErrorMessageJSON()");

		return {
			errorSummary: errorSummary,
			errorMessage: (errorObj === null ? "" : errorObj.message)
		};
	},
	// Returns an array of Create Cards promises
	createCards: (qty, smallImage, largeImage, valueId, colorId) => {
		console.log("===> createCards()");

		const createPromises = [];

		// Start by extracting Values and Colors

		for(let i=0; i<qty; i++) {
			const promise = Cards.create({
				smallImage: smallImage.toLowerCase(),
				largeImage: largeImage.toLowerCase(),
				valueId: valueId,
				colorId: colorId
			});

			createPromises.push(promise);
		}

		return createPromises;
	},

	// Returns a shuffled deck
	newShuffledDeck: () => {
		console.log("===> newShuffledDeck()");

		return Deck.destroy({
			where: {},  // We want all the rows gone!
			truncate: true
		})
		.then((results) => {
			// Get all the cards from the Cards table
			return Cards.findAll();
		})
		.then((cards) => {
			if(cards.length === 0) {
				throw new Error("No cards found in Cards table.  Have you initialized?")
			}

			const deck = Shuffle.shuffle({deck: cards});

			// Insert the shuffled deck into the Deck table
			return db.sequelize.transaction((t) => {
				const createPromises = [];

				for(let i=0; i<deck.cards.length; i++) {
					const promise = Deck.create({
						cardId: deck.cards[i].id
					}, {transaction: t});

					createPromises.push(promise);
				}

				return Promise.all(createPromises);
			});
		})
			/* Sample using async/await FOR REFERENCE ONLY
			newShuffledDeck: async () => {
			await Deck.destroy({where:{}, truncate: true});
			const cards = await Cards.findAll();
			const deck = Shuffle.shuffle({deck: cards});

			return db.sequelize.transaction( t) => {
				const createPromises = [];

				_.each(cards, ({card.id}) => {
				const promise = Deck.create(card.id, {transaction: t});
				createPromises.push(promise);
			});

			return Promise.all(createPromises);
		}*/
	},
	// Adds the specified cardId to the Discard table
	addToDiscardPile: (cardId) => {
		console.log("===> addToDiscardPile()");

		return Discard.create({
			cardId: cardId
		});
	},
	// Removes a card from user's hand and adds it to discard pile
	removeFromHandAndAddToDiscard: (userId, cardId) => {
		console.log("===> removeFromHandAndAddToDiscard()");

		return Hands.destroy({
			where: {
				userId: userId,
				cardId: cardId
			}
		})
		.then((results) => {
			return Discard.create({
				cardId: cardId
			});
		})
	},
	// Draws the specified number of cards from the Deck table
	
	drawCards: (numberOfCards) => {
		console.log("===> drawCards()");

		let originalDeckLength = -1;
		let allCardsDrawn = false;
		let drawnCards = null;
		

		// First check if the draw pile has enough cards to hand out
		return utilities.totalCardsOnDeck()
		.then((total) => {
			// If the number of cards requested is greater or equal to the 
			// number of cards left on the deck
			// 1. Draw all the cards that are left
			// 2. Regenerate the draw pile
			// 3. Draw the rest
			if(numberOfCards >= total[0].dataValues.rows) {
				originalDeckLength = total[0].dataValues.rows;

				// Draw all the cards we have on the deck
				return Deck.findAll()
				.then((currentCards) => {
					drawnCards = currentCards;

					// Regenerate deck
					return utilities.newShuffledDeck()
				})
				.then((results) => {

					// Remove cards in play from the deck
					return utilities.removeCardsInPlayFromDeck();
				})
				.then((results) => {
					// Draw the rest we need
					numberOfCards = numberOfCards - originalDeckLength;

					if(numberOfCards === 0) {
						allCardsDrawn = true;

						return Promise.resolve(drawnCards);
					} else {
						return Deck.findAll({
							limit: numberOfCards
						});
					}
				})
				.then((cards) => {
					if(allCardsDrawn === false) {
						drawnCards = drawnCards.concat(cards);
					}

					return Promise.resolve(drawnCards);
				})
			} else {
				return Deck.findAll({
					limit: numberOfCards
				});
			}
		})
	},
	// Deletes the specified cardIds from the Deck table
	deleteFromDeck: (arrayOfCardIds) => {
		console.log("===> deleteFromDeck()");

		return Deck.destroy({
			where: {
				cardId: {
					[Op.in]: arrayOfCardIds
				}
			}
		});
	},
	// Adds the specified cards to the specified user's hand and deletes them from the Deck
	addCardsToPlayerHand: (userId, cards) => {
		console.log("===> addCardsToPlayerHand()");
		
		return db.sequelize.transaction((t) => {
			const createPromises = [];

			for(let i=0; i<cards.length; i++) {
				let promise = Hands.create({
					cardId: cards[i].cardId,
					userId: userId
				}, {transaction: t})
				.then((hand) => {
					Deck.destroy({
						where: {
							cardId: cards[i].cardId
						}
					});
				});

				createPromises.push(promise);
			}

			return Promise.all(createPromises);
		});

	},
	// Used to deal cards for new game, each player gets 7 cards
	dealCards: (userId) => {
		console.log("===> dealCards()");

		let allCards = null;
		let resultObj = {};
		resultObj.userId = userId;

		// Draw 7 cards
		return utilities.drawCards(7)
		.then((cards) => {
			resultObj.userHand = cards;

			return utilities.addCardsToPlayerHand(userId, cards);
		})
		.then((results) => {
			return Promise.resolve(resultObj);
		});
	},
	// Gets the card on top of the discard pile
	topCardOnDiscard: () => {
		console.log("===> topCardOnDiscard()");

		return Discard.findAll({
			order: [["id", "DESC"]],
			limit: 1
		});
	},
	// Checks if the card is a WILD
	isWildCard: (cardId) => {
		console.log("===> isWildCard()");

		let resultObj = {
			isWildCard: false,
			isWildDrawFour: false
		}

		return Values.findAll({
			include: [{
				model: Cards,
				where: {
					id: cardId
				}
			}]
		})
		.then((result) => {
			if(result[0].card === "WILD") {
				resultObj.isWildCard = true;
			}

			if(result[0].card === "WILD_DRAW_FOUR") {
				resultObj.isWildDrawFour = true;
			}

			return Promise.resolve(resultObj);
		});
	},
	// Sets the player turn
	setPlayerTurn: (playerId, turn) => {
		console.log("===> setPlayerTurn()");

		return Users.update({
  		isTurn: turn,
		}, {
  		where: {
    		id: playerId
  		}
		});
	},
	// Gets the player turn
	isPlayerTurn: (playerId) => {
		console.log("===> isPlayerTurn");

		return Users.findAll({
			where:{
				id: playerId
			}
		});
	},
	// Sets the drawn value for the specified user
	setHasUserDrawn: (playerId, drawn) => {
		console.log("===> setHasUserDrawn()");

		return Users.update({
  		hasDrawn: drawn,
		}, {
  		where: {
    		id: playerId
  		}
		});
	},
	// Checks if the user has drawn a card
	getHasUserDrawn: (playerId) => {
		console.log("===> getHasUserDrawn()");

		return Users.findAll({
			where: {
				id: playerId
			}
		})
		.then((user) => {
			let resultObj = {
				userHasDrawn: user[0].hasDrawn
			}

			return Promise.resolve(resultObj);
		});
	},
	// Gets the next player
	getNextPlayer: () => {
		console.log("===> getNextPlayer()");

		return Users.findAll({
			where: {
				isTurn: 0
			}
		});
	},
	// Sets the color of a WILD card
	setWildCardColor: (cardId, colorName) => {
		// NOTE, need to set colorId to a card with color only??
		console.log("===> setWildCardColor()");

		return Colors.findAll({
			where: {
				color: colorName.toUpperCase()
			}
		})
		.then((color) => {
			Discard.update({
  			colorId: color[0].id
			}, {
  			where: {
    			id: cardId
  			}
			});
		});
	},
	// Get card value
	getCardValue: (cardId) => {
		console.log("===> getCardValue()");

		return Values.findAll({
			include: [{
				model: Cards,
				where: {
					id: cardId
				}
			}]
		});
	},
	// Get card color
	getCardColor: (cardId) => {
		console.log("===> getCardColor()");

		return Colors.findAll({
			include: [{
				model: Cards,
				where: {
					id: cardId
				}
			}]
		});
	},
	// Creates a card object
	getCard: (cardId) => {
		console.log("===> getCard()");

		let cardObj ={
			card: null,
			value: null,
			color: null
		}

		return Cards.findAll({
			where: {
				id: cardId
			}
		})
		.then((card) => {
			cardObj.card = card;

			return Colors.findAll({
				include: [{
					model: Cards,
					where: {
						id: cardId
					}
				}]
			})
		})
		.then((color) => {
			cardObj.color = color;

			return Values.findAll({
				include: [{
					model: Cards,
					where: {
						id: cardId
					}
				}]
			});
		})
		.then((value) => {
			cardObj.value = value;

			return Promise.resolve(cardObj);
		});
	},
	// Checks if the specified card id matches the card on the discard pile
	doesCardMatch: (cardId) => {
		console.log("===> doesCardMatch()");

		let topCard = null;
		let matchCard = null;
		let cardsMatch = false;

		let resultsObj = {};

		return utilities.topCardOnDiscard()
		.then((card) => {
			return utilities.getCard(card[0].cardId);
		})
		.then((card) => {
			topCard = card;

			resultsObj.topCardOnDiscard = topCard;

			// Get card object for the card to match to
			return utilities.getCard(cardId);
		})
		.then((card) => {
			matchCard = card;

			resultsObj.discarded = matchCard;

			if(topCard.value[0].card === matchCard.value[0].card) {
				cardsMatch = true;
			} else if(topCard.color[0].color === matchCard.color[0].color) {
				cardsMatch = true;
			} else {
				cardsMatch = false;
			}

			resultsObj.match = cardsMatch;

			return Promise.resolve(resultsObj);
		});
	},
	// Gets the total number of cards in the Deck
	totalCardsOnDeck: () => {
		console.log("===> totalCardsOnDeck()");

		return Deck.findAll({
			attributes:[[db.sequelize.fn("COUNT", db.sequelize.col("id")), "rows"]]
		});
	},
	// Gets the total number f players
	totalPlayers: () => {
		console.log("===> totalPlayers()");

		let resultObj = {};

		return Users.findAll({
			attributes:[[db.sequelize.fn("COUNT", db.sequelize.col("id")), "total_players"]]
		})
		.then((count) => {
			resultObj.count = count;

			return Users.findAll();
		})
		.then((users) => {
			resultObj.users = users;

			return Promise.resolve(resultObj);
		})
	},
	// Used to remove cards currently in play from the Deck.  Mostly used after a new Deck has been created during game play
	removeCardsInPlayFromDeck: () => {
		console.log("===> removeCardsInPlayFromDeck()");

		const arrayOfCardIds = [];

		return Hands.findAll()
		.then((results) => {

			// Get cards from player hands
			for(let i=0; i<results.length; i++) {
				arrayOfCardIds.push(results[i].cardId);
			}

			return utilities.topCardOnDiscard();
		})
		.then((results) => {
			// Get card currently on top of discard
			arrayOfCardIds.push(results[0].cardId);

			return Deck.destroy({
				where: {
					cardId: {
						[Op.in]: arrayOfCardIds
					}
				}
			});
		});
	},
	// Executes play logic for a card
	playCard: (cardId, userId, nextPlayerId) => {
		console.log("===> playCard()");

		let resultObj = {};

		return utilities.getCard(cardId)
		.then((card) => {
			if(card[0].card === "REVERSE") {
				resultObj.card = card[0].card;

				// For now, in a 2-player game, the turn goes back to the next player.
				return utilities.setPlayerTurn(nextPlayerId, true)
				.then((results) => {
					resultObj.nextPlayer = results;

					return utilities.setPlayerTurn(userId, false)
				})
				.then((results) => {
					resultObj.currentPlayer = results;
				});
			} else if(card[0].card === "SKIP") {
				resultObj.card = card[0].card;

				// For now, in a 2-player game, the turn goes back to the player that played the card.
				return utilities.setPlayerTurn(nextPlayerId, false)
				.then((results) => {
					resultObj.nextPlayer = results;

					return utilities.setPlayerTurn(userId, true)
				})
				.then((results) => {
					resultObj.currentPlayer = results;
				});
			} else if(card[0].card === "DRAW_TWO") {
				resultObj.card = card[0].card;

				// Add two cards to the next player's hand.  Turn goes to the next player
				return utilities.drawCards(2)
				.then((cards) => {
					utilities.addCardsToPlayerHand(nextPlayerId, nextPlayerId);

					return utilities.setPlayerTurn(nextPlayerId, true);
				})
				.then((results) => {
					resultObj.nextPlayer = results;

					return utilities.setPlayerTurn(userId, false)
				})
				.then((results) => {
					return resultObj.currentPlayer = results;
				})
			} else {
				// If execution reaches here, that means the card matched on color or a number
				return utilities.setPlayerTurn(nextPlayerId, true)
				.then((results) => {
					resultObj.nextPlayer = results;

					return utilities.setPlayerTurn(userId, false)
				})
				.then((results) => {
					return resultObj.currentPlayer = results;
				});
			}
		})
		.then((result) => {
			return Promise.resolve(resultObj);
		})
	}
}

module.exports = utilities;