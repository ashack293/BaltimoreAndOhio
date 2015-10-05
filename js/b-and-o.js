"use strict";

// tech levels and corresponding possible company valuations
// at some point we might build the tech levels into this tool
var techValuations = {
  1:new Array(55, 60, 66),
  2:new Array(60, 66, 74),
  3:new Array(66, 74, 82),
  4:new Array(74, 82, 91),
  5:new Array(82, 91, 100)
};

// ordered array of all possible stock valuations
var valuations = [34, 37, 41, 45, 50, 55, 60, 66, 74, 82, 91, 100, 110, 121, 133, 146, 160, 176, 194, 213, 234, 257, 282, 310, 341, 375];

// show javascript alerts in addition to log messages?
var showAlerts = false;

var maxPlayers = 6;

var currentTechLevel = 1;
// global funds available at game start
var startingFunds = 1500;
var players = [];

var co_bando = new company("Baltimore & Ohio", "Baltimore", "blue", 1);
var co_bandm = new company("Boston & Maine", "Boston", "pink", 1);
var co_cando = new company("Chesapeake & Ohio", "Richmond", "yellow", 1);
var co_icent = new company("Illinois Central", "Saint Louis", "orange", 1);
var co_erie = new company("Erie", "Buffalo", "brown", 1);
var co_nyc = new company("New York Central", "Albany", "green", 1);
var co_nipl = new company("Nickel Plate", "Richmond", "purple", 1);
var co_nynhh = new company("New York, New Haven & Hartford", "Saint Louis",
                            "white", 1);
var co_penn = new company("Pennsylvania", "Buffalo", "red", 1);
var co_wbsh = new company("Wabash", "Albany", "gray", 1);

// collection of the company objects
var companies = [co_bando, co_bandm, co_cando, co_icent, co_erie, co_nyc, co_nipl, co_nynhh, co_penn, co_wbsh];

// company instantiation
function company(name, starting_city, co_color, tech_level) {
  this.companyName = name;
  this.valuation = 80;
  this.netProfit = 0;
  this.cash = 0;
  this.companyColor = co_color;
  this.sharesOwned = 10;
  this.sharesOrphaned = 0;
  this.techLevel = tech_level;
  this.buyShares = function(companyName, shareCount, purchasePrice){
    if(companyName != this.companyName){
      logEvent('Company can only buy its own shares.', 'warning');
      return;
    }
    this.cash -= (shareCount * purchasePrice);
    this.sharesOwned += parseInt(shareCount);
    this.sharesOrphaned -= parseInt(shareCount);
  }
}

// player instantiation
function player(name) {
  this.playerName = name;
  this.cash = 0;
  this.netWorth = 0;
  this.shares = [];
  this.buyShares = function(companyName, shareCount, purchasePrice){
      this.cash -= (shareCount * purchasePrice);
      for(var i = 0; i < shareCount; i++){
        var newShare = new share(companyName, 1, purchasePrice);
        this.shares.push(newShare);
      }
      calculatePlayerNetWorth(this);
      logEvent(this.playerName + ' purchased ' + shareCount + ' of ' + companyName + ' for $' + (shareCount * purchasePrice), 'success');
  }
}

function share(companyName, shareCount, purchasePrice){
  this.companyName = companyName;
  this.shareCount = shareCount;
  this.purchasePrice = purchasePrice;
}



////////// Game Logic ///////////

function calculatePlayerNetWorth(player){
  var netWorth = player.cash;
  _.each(player.shares, function(share){
    netWorth += (getValuationForCompany(share.companyName) * share.shareCount);
  });
  player.netWorth = netWorth;
}

function allocateStartingFunds(){
  var startingPlayerFunds = startingFunds / players.length;
  _.each(players, function(player){
    player.cash = startingPlayerFunds;
    calculatePlayerNetWorth(player);
  });
  updatePlayerView();
  logEvent('Each player starts with $' + startingPlayerFunds, 'success');
}


// establish opening condition for the game
function setupGame(){
  allocateStartingFunds();
  updateCompanyView();
  updateDropdowns();
}

/* attempt a purchase, check all possible errors and enforce game rules:
- only 10 stocks can be in play for each company
- companies can only buy their own, orphaned stock
- purchases cannot exceed the buyer's cash
- purchases may not exceed available shares
*/
function tryBuyTransaction(buyer, seller, shares, buyingOrphans){
  var buyerEntity;
  var buyerIsCompany = false;
  if(stringIsCompanyName(buyer)){
    buyerEntity = getCompanyByName(buyer);
    buyerIsCompany = true;
  } else {
    buyerEntity = getPlayerByName(buyer);
  }

  var sellerCompany = getCompanyByName(seller);
  var saleValue = sellerCompany.valuation * shares;
  if(buyerEntity.cash < saleValue){
    logEvent('Sale price of $' + saleValue + ' is more than ' + buyer + ' can spend.', 'danger');
  } else if(!buyerIsCompany && (sellerCompany.sharesOwned < shares)){
    logEvent('Cannot purchase more shares of ' + seller + ' than are available for sale.', 'danger');
  } else if(buyerIsCompany && (buyer != seller)){
    logEvent('Cannot purchase shares of a different company.', 'danger');
  } else if(buyerIsCompany && (shares > sellerCompany.sharesOrphaned)){
    logEvent('Cannot purchase more shares of ' + seller + ' than are available for sale.', 'danger');
  } else {
    // complete the sale
    buyerEntity.buyShares(seller, shares, sellerCompany.valuation);
    if(buyerIsCompany){
      // destroy the orphaned stocks in private method
    } else {
      // if buying orphaned stock, update orphaned count. else update company shares and cash
      if(buyingOrphans){
        sellerCompany.sharesOrphaned -= shares;
      } else {
        sellerCompany.sharesOwned -= shares;
        sellerCompany.cash += saleValue;
      }
      updatePlayerView();
    }
    updateCompanyView();
    updateDropdowns();
    updateBuyMessage('Success!');
  }
}

function trySellTransaction(seller, company, shares){
  var sellerEntity = getPlayerByName(seller);
  var companyEntity = getCompanyByName(company);
  var shareValue = getValuationForCompany(company);
  var availableShares = _.filter(sellerEntity.shares, function(share){
    return share.companyName == company;
  });
  if(availableShares.length < shares){
    logEvent('Cannot sell more shares of ' + company + ' than the player owns.', 'danger');
    return;
  }
  for(var i = 0; i < shares; i++){
    var getShare = availableShares[i];
    sellerEntity.cash += shareValue;
    var shareIndex = _.findIndex(sellerEntity.shares, function(share){
      return share.companyName == company;
    });
    sellerEntity.shares.splice(shareIndex, 1);
    companyEntity.sharesOrphaned++;
    console.log(companyEntity);
  }

  updatePlayerView();
  updateCompanyView();
  updateDropdowns();
  logEvent(seller + ' sold  ' + shares + ' shares of ' + company + ' for $' + (shares*shareValue), 'success');
  updateSellMessage('Success!');
}

//manually update game parameters. good for both use in-game and to fix user errors.
function adjustTransaction(entity, cash, profit, valuation){
  var adjustEntity;
  var entityIsCompany = false;
  if(stringIsCompanyName(entity)){
    adjustEntity = getCompanyByName(entity);
    entityIsCompany = true;
  } else {
    adjustEntity = getPlayerByName(entity);
  }
  if(!isNaN(parseInt(cash))){
    adjustEntity.cash = parseInt(cash);
    logEvent('Adjusted cash for ' + entity + ': $' + cash, 'warning');
  }
  if(entityIsCompany){
    if(!isNaN(parseInt(profit))){
      adjustEntity.netProfit = profit;
      logEvent('Adjusted profit for ' + entity + ': $' + profit, 'warning');
    }
    if(!isNaN(parseInt(valuation))){
      adjustEntity.valuation = valuation;
      logEvent('Adjusted valuation for ' + entity + ': $' + valuation, 'warning');
    }
  }
  _.each(players, function(player){
    calculatePlayerNetWorth(player);
  });

  updatePlayerView();
  updateCompanyView();
  updateAdjustMessage('');
}

// try to add company's revenue to their cash holdings
function tryWithholdDividends(_companyName){
  if(stringIsCompanyName(_companyName)){
    var company = getCompanyByName(_companyName);
    company.cash += parseInt(company.netProfit);
    logEvent(company.companyName + ' withholds revenue:  $' + company.netProfit + ' added to treasury.', 'success');
    updatePlayerView();
    updateCompanyView();
  } else {
      logEvent('Unable to locate company ' + _companyName, 'warning');
  }
}

// try to pay dividends on a company's revenue
function tryPayDividends(_companyName){
  if(stringIsCompanyName(_companyName)){
    var company = getCompanyByName(_companyName);
    var singleDividend = company.netProfit / 10;
    var companyShare = company.sharesOwned * singleDividend;
    company.cash += parseInt(companyShare);

    logEvent(company.companyName + ' pays dividends:  $' + companyShare + ' added to treasury.', 'success');

    // iterate through each player and pay them out for their shares in the company
    _.each(players, function(player){
      var playerRevenue = 0;
      _.each(player.shares, function(share){
        if(share.companyName == company.companyName){
          playerRevenue += parseInt(singleDividend);
        }
      });
      if(playerRevenue > 0){
        player.cash += parseInt(playerRevenue);
        logEvent(player.playerName + ' receives dividends of:  $' + playerRevenue, 'success');
      }
    });

    updatePlayerView();
    updateCompanyView();
  } else {
    logEvent('Unable to locate company ' + _companyName, 'warning');
  }
}

// return share value for a company name
function getValuationForCompany(_companyName){
  var company = _.findWhere(companies, {companyName: _companyName});
  return company.valuation;
}

// returns true/false for whether the string being evaluated is a company
function stringIsCompanyName(string){
  if(_.findWhere(companies, {companyName: string})){
    return true;
  } else {
    return false;
  }
}

function getCompanyByName(name){
  return _.findWhere(companies, {companyName: name});
}

function getPlayerByName(name){
  return _.findWhere(players, {playerName: name});
}


/////////////////////////////////

////////// UI Updates ///////////
// keeps UI changes separate from game logic

// shows success message when a transaction has been completed
function updateBuyMessage(message){
  $('#buySharesNumber').val('');
  $('.buy-message').html(message);
  $('.buy-message').addClass('text-success');
}


// shows success message when a transaction has been completed
function updateSellMessage(message){
  $('#sellSharesNumber').val('');
  $('.sell-message').html(message);
  $('.sell-message').addClass('text-success');
}

function updateAdjustMessage(message){
  $('#adjustCash').val('');
  $('#adjustProfit').val('');
  $('#adjustValuation').val(' ');
}

function updateCompanyView(){
  $('.company-table tr:gt(0)').remove();
  _.each(companies, function(company){
    if(currentTechLevel >= company.techLevel){
      addCompanyToView(company);
    }
  });
}

// use this to perform UI updates when adding a company
function addCompanyToView(company){
  var companyHTML = '<tr><td data-ref="' + company.companyName + '" class="company-name"><div class="company-swatch ' + company.companyColor + '"></div>' + company.companyName + '</td>';
  companyHTML += '<td>$' + company.cash + '</td>';
  companyHTML += '<td>$' + company.netProfit + '</td>';
  companyHTML += '<td>$' + company.valuation + '</td>';
  companyHTML += '<td>' + company.sharesOwned + '</td>';
  companyHTML += '<td>' + company.sharesOrphaned + '</td>';
  companyHTML += '</tr>';
  $('.company-table').append(companyHTML);
}

// resets table of players
function updatePlayerView(){
  $('.player-table tr:gt(0)').remove();
  _.each(players, function(player){
      var playerHTML = '<tr><td>' + player.playerName + '</td>';
      playerHTML += '<td>$' + player.cash + '</td>';
      playerHTML += '<td>$' + player.netWorth + '</td>';
      playerHTML += '<td>' + updatePlayerShareView(player) + '</td>';
      $('.player-table').append(playerHTML);
  });
}

function updatePlayerShareView(player){
  var output = '';

  var groupedShares = _.groupBy(player.shares, function(share){
    return share.companyName;
  });

  _.each(groupedShares, function(group){
    var share = group[0];
    var company = getCompanyByName(share.companyName);
    output += '<div class="company-swatch ' + company.companyColor + '"></div>' + share.companyName + ': ' +  group.length + ' <br />';
  });
  return output;
}

//populate dropdowns with all valid players and companies, as well as orphaned stocks
function updateDropdowns(){
  $('#buyerSelect option').remove();
  $('#buyCompanySelect option').remove();
  $('#sellerSelect option').remove();
  $('#sellCompanySelect option').remove();
  $('#adjustSelect option').remove();
  $('#dividendSelect option').remove();
  $('#adjustValuation option').remove();

  $('#adjustValuation').append('<option selected="selected"> </option>');
  _.each(valuations, function(valuation){
    $('#adjustValuation').append('<option>' + valuation + '</option>');
  });

  _.each(players, function(player){
    $('#buyerSelect').append('<option>' + player.playerName + '</option>');
    $('#sellerSelect').append('<option>' + player.playerName + '</option>');
    $('#adjustSelect').append('<option>' + player.playerName + '</option>');
  });

  $('#buyerSelect').append('<option role="separator" disabled="disabled"></option>');
  $('#adjustSelect').append('<option role="separator" disabled="disabled"></option>');
  _.each(companies, function(company){
    console.log(company);
    $('#buyCompanySelect').append('<option>' + company.companyName + '</option>');
    $('#buyerSelect').append('<option>' + company.companyName + '</option>');
    $('#adjustSelect').append('<option>' + company.companyName + '</option>');
    $('#sellCompanySelect').append('<option>' + company.companyName + '</option>');
    $('#dividendSelect').append('<option>' + company.companyName + '</option>');
    if(company.sharesOrphaned > 0){
      $('#buyCompanySelect').append('<option>(orphaned) ' + company.companyName + '</option>');
    }
  });
}

function updateBuySharesInfo(companyName, _numberOfShares) {
  var company = getCompanyByName(companyName);
  var numberOfShares = 0;
  if(_numberOfShares){
    numberOfShares = _numberOfShares;
  }

  var price = numberOfShares * company.valuation;
  var message = '<h4 class="buy-message">Buy ' + numberOfShares + ' shares of ' + companyName + ' at $' + company.valuation + ' for a total of ' + '<strong>$' + price + '</strong>?</h4>';

  $('#buySharesInfo').html(message);
}

// prints game history to the log at the bottom
// status can be success, info, warning, danger
function logEvent(message, status){
 $('.log .panel-body').prepend('<div class="alert alert-' + status + '">' + message + '</div>');
 if(showAlerts){
  alert(message);
 }
}

function changeTabState(selectedTab, selectedPanel){
  if(!$(selectedTab).parent().hasClass('active')){
    _.each($('.transaction-tab-li'), function(tab){
      $(tab).removeClass('active');
    });

    _.each($('.transaction-col'), function(panel){
      $(panel).hide();
    });

    $(selectedTab).parent().addClass('active');
    $(selectedPanel).show();
  }
}

////////// INPUT VALIDATION ////////
function validateNumeric(evt) {
  var theEvent = evt || window.event;
  var key = theEvent.keyCode || theEvent.which;
  key = String.fromCharCode( key );
  var regex = /[0-9]|\./;
  if( !regex.test(key) ) {
    theEvent.returnValue = false;
    if(theEvent.preventDefault) theEvent.preventDefault();
  }
}

$(document).ready(function() {

  $('.sell-col').hide();
  $('.adjust-col').hide();
  $('.dividend-col').hide();
  $('.trades').hide();

  $('.buy-tab').on('click', function(e){
    e.preventDefault();
    changeTabState($(this), $('.buy-col'));
  });

  $('.sell-tab').on('click', function(e){
    e.preventDefault();
    changeTabState($(this), $('.sell-col'));
  });

  $('.adjust-tab').on('click', function(e){
    e.preventDefault();
    changeTabState($(this), $('.adjust-col'));
  });

  $('.dividends-tab').on('click', function(e){
    e.preventDefault();
    changeTabState($(this), $('.dividend-col'));
  });


  $('#addPlayer').on('click', function (e) {
    if($('#inputPlayerName').val().length > 0){
      var playerName = $('#inputPlayerName').val();
      $('#inputPlayerName').val('');
      logEvent('Added player ' + playerName + ' to the game.', 'info');
      var newPlayer = new player(playerName);
      players.push(newPlayer);
      updatePlayerView();
      if(players.length >= maxPlayers){
        $('#addPlayerDone').trigger('click');
      }
    }
  });

  $('#addPlayerDone').on('click', function (e) {
    e.preventDefault();
    $('.setup').hide();
    $('.trades').show();
    logEvent('Finished adding players to the game.', 'info');
    setupGame();
  });

  $('#buyerSelect').on('change', function() {
    if(stringIsCompanyName(this.value)){
      $('#buyCompanySelect').val(this.value);
    }
  });

  $('#buyerSelect').on('change', function() {
    updateBuySharesInfo(this.value);
  });

  $('#buySharesNumber').on('change', function() {
    var buyCompany =  $('#buyCompanySelect').val().replace('(orphaned) ', '');
    updateBuySharesInfo(buyCompany, this.value);
  });

  $('#purchaseButton').on('click', function(e){
    e.preventDefault();
    // send the buyer, seller, share count, and a flag indicating whether the stocks being purchased are orphaned
    var buyCompany =  $('#buyCompanySelect').val().replace('(orphaned) ', '');
    tryBuyTransaction($('#buyerSelect').val(), buyCompany, $('#buySharesNumber').val(), ($('#buyCompanySelect').val().indexOf('orphaned') > -1));
  });

  $('#sellButton').on('click', function(e){
    e.preventDefault();
    trySellTransaction($('#sellerSelect').val(), $('#sellCompanySelect').val(), $('#sellSharesNumber').val());
  });

  $('#adjustButton').on('click', function(e){
    e.preventDefault();
    adjustTransaction($('#adjustSelect').val(), $('#adjustCash').val(), $('#adjustProfit').val(), $('#adjustValuation').val());
  });

  $('#dividendsPayButton').on('click', function(e){
    e.preventDefault();
    tryPayDividends($('#dividendSelect').val());
  });

  $('#dividendsWithholdButton').on('click', function(e){
    e.preventDefault();
    tryWithholdDividends($('#dividendSelect').val());
  });

  $('.trades form').on('submit', function(e){
    e.preventDefault();
  });
});