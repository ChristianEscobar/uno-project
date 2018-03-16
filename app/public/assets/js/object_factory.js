;(function(window){
	// Game
	var Game = function(el, option){
		this.el = document.getElementById(el);
		this.option = option;

		this.deck_div = document.createElement("div");
		this.deck_div.id = "deck_div";
		this.gameDeck = new Deck(this.deck_div, option);
		this.gameDeck.buildDeck();

		this.el.appendChild(this.deck_div);

	};

	// Deck
	var Deck = function(deck_div, option){

		this.deckData = option.data;
		this.buildDeck = function(){
			var parentFrag = document.createDocumentFragment();
			deck_div.innerHTML = "";
			for (var i = this.deckData.length - 1; i >= 0; i--) {
				var card = new Card();
				card.id = "card-" + i;
				card.data = this.deckData[i].card[0];
				console.log(card.data);
				card.buildCard(parentFrag);
			};
			deck_div.appendChild(parentFrag);

		};


	};
	// 	Cards
	// 	----
	// 	shuffle
	// 	stack

	// Card
	var Card = function(){
		this.id = "";
		this.data = "";
		this.cardCont = document.createElement("div");
		this.cardCont.className = "card_container guide1";
		this.cardFront = document.createElement("div");
		this.cardFront.className = "card_front";
		this.cardBack = document.createElement("div");
		this.cardBack.className = "card_back";
		this.buildCard = function(parentFrag){
			var flipDiv = document.createElement("div"),
				frontImg = document.createElement("img"),
				backImg = document.createElement("img")
			flipDiv.className = "flip";
			frontImg.className = "front_val responsive-img card-display";
			backImg.className = "back_val responsive-img card-display";

			var cardBack = "assets/images/cards/small/card_back_alt.png"

			frontImg.src = "assets/images/cards/small/" + this.data.smallImage;
			backImg.src = cardBack;

			this.cardFront.appendChild(frontImg);
			this.cardBack.appendChild(backImg);

			flipDiv.appendChild(this.cardFront);
			flipDiv.appendChild(this.cardBack);

			this.cardCont.id = this.id;
			this.cardCont.appendChild(flipDiv);

			this.cardCont.onclick = function(e){
				console.log(e.target, e.currentTarget);
				console.log(e.currentTarget.className, e.currentTarget.classList);
				console.log(this);
			}

			parentFrag.appendChild(this.cardCont);
		}
	}
	// 	val
	// 	suit
	// 	----
	// 	flip

	// Discard Pile
	var DiscardPile = function(){

	}
	// 	Holders
	// 	----
	// 	accept or reject
	window.Game = Game;
})(window);
