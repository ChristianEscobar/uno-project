$(document).ready(function() {

  $(".button-collapse").sideNav();

  dragula([document.getElementById('hand'), document.getElementById('discard')], {
    revertOnSpill: true
  });

  function updateDiscard(event) {

    event.preventDefault();
    event.target.style.opacity = "";
    $('discard').replaceWith("");

  };

});
