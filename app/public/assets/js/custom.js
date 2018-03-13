$(document).ready(function() {

  $(".button-collapse").sideNav();

  dragula([document.getElementById('hand'), document.getElementById('discard')], {
    revertOnSpill: true

  });

});
