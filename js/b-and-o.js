// tech levels and corresponding possible company valuations
var techValuations = {
  1:new Array(55, 60, 66),
  2:new Array(60, 66, 74),
  3:new Array(66, 74, 82),
  4:new Array(74, 82, 91),
  5:new Array(82, 91, 100)
};

var maxPlayers = 5;
// global funds available at game start
var startingFunds = 1500;
var players = [];

// company instantiation
function company(name, starting_city, co_color) {
  this.companyName = name;
  this.trains = [];
  this.coal = 0;
  this.stock_value = 0;
  this.last_profit = 0;
  this.companyColor = co_color;
}

// player instantiation
function player(name) {
  this.playerName = name;
}

////////// Game Logic ///////////


function createCompanies(){
    _.each(companies, company, function(){
      addCompanyToView(company);
    });
}

function allocateStartingFunds(){
  var startingPlayerFunds = startingFunds / players.length;
  _.each(players, player, function(){
  });
}


// establish opening condition for the game
function setupGame(){
  createCompanies();
  allocateStartingFunds();
}


/////////////////////////////////

////////// UI Updates ///////////
// keeps UI changes separate from game logic

// use this to perform UI updates when adding a company
function addCompanyToView(company){
  $('.companies').append('<div class="' + company.companyColor + '"><h3>' + company.companyName + '</h3></div>');
}



// prints game history to the log at the bottom
// status can be success, info, warning, danger
function logEvent(message, status){
 $('.log .panel-body').append('<div class="alert alert-' + status + '">' + message + '</div>');
}



$(document).ready(function() {

  var co_bando = new company("Baltimore & Ohio", "Baltimore", "blue");
  var co_bandm = new company("Boston & Maine", "Boston", "pink");
  var co_cando = new company("Chesapeake & Ohio", "Richmond", "yellow");
  var co_icent = new company("Illinois Central", "Saint Louis", "orange");
  var co_erie = new company("Erie", "Buffalo", "brown");
  var co_nyc = new company("New York Central", "Albany", "green");
  var co_nipl = new company("Nickel Plate", "Richmond", "purple");
  var co_nynhh = new company("New York, New Haven & Hartford", "Saint Louis",
                              "white");
  var co_penn = new company("Pennsylvania", "Buffalo", "red");
  var co_wbsh = new company("Wabash", "Albany", "gray");

  // collection of the company objects
  var companies = [co_bando, co_bandm, co_cando, co_icent, co_erie, co_nyc, co_nipl, co_nynhh, co_penn, co_wbsh];

  $('#addPlayer').on('click', function (e) {
    if($('#inputPlayerName').val().length > 0){
      var playerName = $('#inputPlayerName').val();
      $('.player-list').append('<p>' + playerName + '</p>');
      $('#inputPlayerName').val('');
      logEvent('Added player ' + playerName + ' to the game.', 'success');
      var newPlayer = new player(playerName);
      players.push(newPlayer);
      if(players.length >= maxPlayers){
        $('#addPlayerDone').trigger('click');
      }
    }
  });

  $('#addPlayerDone').on('click', function (e) {
    $('.player-input-group').hide();
    logEvent('Finished adding players to the game.', 'success');
    setupGame();
  });

});