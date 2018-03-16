$(document).ready(function(){
	// the "href" attribute of the modal trigger must specify the modal ID that wants to be triggered
 	$('.modal').modal();

 	// clear session storage
 	sessionStorage.clear();
});

$("#play").on("click", function(event) {
	const playerName = $("#name").val().trim();

 	$.post("/game/player", {name: playerName}, function(result){

 		if(result.id > 0) {
			sessionStorage.setItem("playerId", result.id);

			console.log("id", sessionStorage.getItem("playerId"));

			window.location = "./game.html";
		}
 	});
});
