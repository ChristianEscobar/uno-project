// Populate the Player's hand
$(document).ready(function(event) {
	const playerHandURL = "/game/hand/" + sessionStorage.playerId;

	const deckURL = "/game/deck";

	$.get(deckURL)
	.then((deck) => {
		const myGame = new Game("draw_pile", {game: "draw", data: deck});
	})
})