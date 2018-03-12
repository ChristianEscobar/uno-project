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
		return {
			errorSummary: errorSummary,
			errorMessage: (errorObj ? errorObj.message : "")
		};
	},
	// Returns an array of Create Cards promises
	createCards: (qty, smallImage, largeImage, valueId, colorId) => {
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
		return Discard.create({
			cardId: cardId
		});
	},
	// Removes a card from user's hand and adds it to discard pile
	removeFromHandAndAddToDiscard: (userId, cardId) => {
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
	// isForGameSetup is used to ensure only a numbered card is the first on the discard pile
	drawCards: (numberOfCards) => {
		return Deck.findAll({
			limit: numberOfCards
		});
	},
	// Deletes the specified cardIds from the Deck table
	deleteFromDeck: (arrayOfCardIds) => {
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
	dealCards: (userId, drawCardsFn, addCardsToPlayerHandFn, deleteFromDeckFn) => {
		let allCards = null;

		// Draw 7 cards
		return drawCardsFn(7)
		.then((cards) => {
			allCards = cards;

			return addCardsToPlayerHandFn(userId, cards);
		});
	}
}

module.exports = utilities;