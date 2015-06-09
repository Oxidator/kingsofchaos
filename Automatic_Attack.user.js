// ==UserScript==
// @name        Automatic Attack
// @description automatic attacks
// @include     http://*.kingsofchaos.com/*
// @require     http://code.jquery.com/jquery-latest.js
// @version     1
// @grant       none
// ==/UserScript==
var MAX_GOLD = 40000000; // 40M
var DEFAULT_BUY = getOwnStorage('DEFAULT_BUY') || 'Chariot';
var MIN_TBG = 1.2;
var MIN_FOD_TBG = 1.2;
var IGNORE_TBG_ALLIANCES = [
];
var MIN_FOD_TBG_ALLIANCES = [
  'Forces of Darkness', 'Sweet Revenge'
];
var RELOAD_INTERVAL = 60000; // 1 minute
var WAIT_FOR_LOGIN = 30000; // .5 minutes
var WAIT_FOR_SPY = 60000 * 60 * 12; // 12 hours after maxed out on spy
var MIN_ATTACK_GOLD = getOwnStorage('MIN_ATTACK_GOLD') || 100000000; // 100M
var MAX_PERCENTAGE_ATTACK = 86; // 85%
var MIN_MERCS = 0.05; // 5%
var MAX_MERCS = 0.08; // 8%
var TREASURY_ROW = 8;
var MAX_SPY = 12;
var TIME_NOT_ATTACK = 60 * 3600 * 1000; // 1 hour in ms
var interval = setInterval(function () {
  refreshPage();
}, RELOAD_INTERVAL);
function refreshPage() {
  if ($.inArray(window.location.pathname, [
    '/base.php',
    '',
    '/error.php'
  ]) >= 0 ||
  window.location.search.indexOf('?id=farmlist') === 0 ||
  window.title === 'Kings of Chaos :: Build Your Army, Conquer Your Enemies, Become a King of Chaos!') {
    window.location.reload();
  } else {
    closeTab();
  }
}
$(document).ready(function () {
  insertParameterInputs();
  var title = document.title.trim();
  console.log(window.location);
  // Check for gold first
  try {
    if (checkForGold()) return; // If it returns true we're not going to do anything else
    checkTurns();
  } catch (err) {
    // Do nothing here..
  }
  if (title == 'Kings of Chaos :: Build Your Army, Conquer Your Enemies, Become a King of Chaos!') {
    logIn();
  }
  if (window.location.pathname == '/stats.php' && window.location.search.match(/\?id=\d+/g)) {
      if (getFromTable(1, TREASURY_ROW, 0).indexOf('Treasury') === -1) {
        TREASURY_ROW = TREASURY_ROW + 2; // If not 8 then 10;
      }
    var ival = setInterval(function () {
      if (getFromTable(1, TREASURY_ROW, 1).indexOf('Loading') === - 1 && stringToNum(getFromTable(2, 4, 1)) > 0) {
        clearInterval(ival);
        onUserStats();
      }
    }, 200);
  } else if (window.location.pathname == '/attack.php') {
    onAttack();
  } else if (window.location.pathname == '/inteldetail.php' && window.location.search.match(/\?report_id=\d+/g)) {
    onActionReport();
  } else if (window.location.pathname == '/detail.php' && window.location.search.match(/\?attack_id=\d+/g)) {
    onAttackReport();
  } else if (window.location.pathname == '/stats.php' && window.location.search.indexOf('?id=farmlist') === 0) {
    if (getOwnStorage('spy') === undefined) {
      goToUrl('base.php');
    } else {
      var ival = setInterval(function () {
        if ($('legend').length > 0) {
          clearInterval(ival);
          onFarmList();
        }
      }, 500);
    }    
  } else if (window.location.pathname == '/base.php') {
    onBase();
  } else if (window.location.pathname == '/armory.php') {
    onArmory();
  } else if (window.location.pathname == '/mercs.php') {
    onMercs();
  }
});
function closeTab() {
  console.log('Closing this tab: ' + window.location);
  console.trace();
  window.close();
}
function onBase() {
  var attack = stringToNum(getFromTable(8, 1, 1));
  var spy = stringToNum(getFromTable(8, 3, 1));
  setOwnStorage('attack', attack);
  setOwnStorage('spy', spy);
}
function onUserStats() {
  var pid = stringToNum(window.location.search);
  var action = getStorage(pid, 'action');
  var treasury = stringToNum(getFromTable(1, TREASURY_ROW, 1).replace(/\(.+\)/g, ''));
  var tbg = stringToNum(getFromTable(1, TREASURY_ROW + 1, 1));
  var span = $('.table_lines').children().eq(1).children().eq(TREASURY_ROW).children().eq(1).find('span:last');
  var defense = stringToNum(getFromTable(2, 2, 1));
  var sentry = stringToNum(getFromTable(2, 4, 1));
  setStorage(pid, 'sentry', sentry);
  var primaryAlliance = $('.table_lines').children().eq(1).children().eq(5).children().eq(1).find('a').eq(0).text();
  var lastAttacked = getStorage(pid, 'attacked') || 0;
  var times;
  if (span.length > 0) {
    times = $(span).prop('title').split(',');
  }
  if (defense < getOwnStorage('attack') * MAX_PERCENTAGE_ATTACK / 100 && lastAttacked + TIME_NOT_ATTACK < Date.now() &&
      (action === 'attack' || ((treasury > tbg * MIN_TBG || $.inArray(primaryAlliance, IGNORE_TBG_ALLIANCES)) &&
       treasury > MIN_ATTACK_GOLD && times === undefined))) {
    if (!$.inArray(primaryAlliance, MIN_FOD_TBG_ALLIANCES) || ($.inArray(primaryAlliance, MIN_FOD_TBG_ALLIANCES) && treasury > tbg * MIN_FOD_TBG)) {
      setActionTBG(pid, 'attack', tbg);
      $('input[name=\'attackbut\']:first').prop('onclick', 'return true;');
      $('input[name=\'attackbut\']:first').click();
    }
  } else if (action === 'spy' && times !== undefined && getOwnStorage('spy') * MAX_SPY > sentry) {
    var timeInSec = timesArrayToSec(times);
    if (treasury + tbg / 3600 * timeInSec > tbg * MIN_TBG) {
      setActionTBG(pid, 'spy', tbg);
      document.getElementsByName('spyrbut') [0].click();
    }
  } else {
    console.log(pid, treasury, tbg, defense, sentry, action, times, getOwnStorage('spy'), MIN_ATTACK_GOLD);
    setActionTBG(pid, 'none', tbg);
    closeTab();
  }
}
function logIn() {
  if ($('input.login_input').length === 0 || parseInt(getOwnStorage('login')) + WAIT_FOR_LOGIN > Date.now())
  return;
  var ival = setInterval(function () {
    if ($('input.login_input').eq(0).attr('value') !== '') {
      clearInterval(ival);
      setOwnStorage('login', Date.now());
      $('input.login_input[type=\'submit\']').click();
    }
  }, 500);
}
function getOwnStorage(attr) {
  return localStorage[attr];
}
function getStorage(pid, attr) {
  var s = localStorage[pid];
  if (s === null || s === undefined || s === '') {
    if (attr !== undefined) {
      return undefined;
    }
    return {};
  }
  var obj = JSON.parse(s);
  if (attr !== undefined) {
    return obj[attr];
  }
  return obj;
}
function setOwnStorage(attr, val) {
  localStorage[attr] = val;
}
function setStorage(pid, attr, val) {
  var obj = getStorage(pid);
  obj[attr] = val;
  if (attr === 'action' && val !== 'none') {
    obj.lastAction = Date.now();
  }
  localStorage[pid] = JSON.stringify(obj);
}
function setActionTBG(pid, action, tbg) {
      setStorage(pid, 'action', action);
      setStorage(pid, 'tbg', tbg);
}
function onActionReport() {
  var pid = $('td.content input:first').attr('value');
  var report = $('td.content p:first').text();
  if (report.indexOf('successfully') === - 1 && report.indexOf('Chief of Intelligence provides') === - 1) { // Report failed / Sabotage
    $('form input:last').click();
  } else { // Report succeeded
    var gold = stringToNum(getFromTable(2, 1, 0));
    var tbg = getStorage(pid, 'tbg');
    if (gold > tbg * MIN_TBG && gold > MIN_ATTACK_GOLD) { // Enough gold to attack
      setStorage(pid, 'action', 'attack');
      $('form input:last').click();
    } else { // Otherwise close tab?
      console.log('Not enough to steal: ' + gold + ' compared to TBG of ' + tbg);
      setStorage(pid, 'action', 'none');
      closeTab();
    }
  }
}
function onAttack() {
  var pid = stringToNum($('.table_lines').eq(3).find('a').attr('href'));
  var action = getStorage(pid, 'action');
  if (action === 'attack') {
    setStorage(pid, 'attacked', Date.now());
    document.getElementsByName('attackbut') [0].click();
  } else if ($('td.content font').text().indexOf('You can recon a player only 15 times in 24 hours.') >= 0) {
    setStorage(pid, 'action', 'none');
    setStorage(pid, 'spy_max', Date.now());
    closeTab();
  } else if (action === 'spy') {
    document.getElementsByName('spyrbut') [0].click();
  }
}
function onAttackReport() {
  var pid = $('td.content input:first').attr('value');
  setStorage(pid, 'action', 'none');
  goToUrl('mercs.php');
}
function onFarmList() {
  var highList = {}, tds, ref, pid, lastAttacked;
  var trs = $('.table_lines tr');
  for (var i = 2; i < trs.length; i++) {
    tds = $(trs).eq(i).find('td');
    ref = $(tds).eq(2).find('a:first').attr('href');
    pid = stringToNum(ref);
    lastAttacked = getStorage(pid, 'attacked') || 0;
    if (stringToNum($(tds).eq(5).text()) <= MAX_PERCENTAGE_ATTACK && lastAttacked + TIME_NOT_ATTACK < Date.now()) {
      var oldMoneys = stringToNum($(tds).eq(3).text());
      var times1 = $(tds).eq(4).find('span:first').prop('title').split(',');
      var times2 = $(tds).eq(7).find('span:first').prop('title').split(',');
      var timeInSec = Math.min(timesArrayToSec(times1), timesArrayToSec(times2));
      var tbg = stringToNum($(tds).eq(8).text());
      setActionTBG(pid, 'none', tbg);
      timeInSec = Math.min(timeInSec, 7200); // Max of 2 hours
      var potMoneys = oldMoneys + tbg / 3600 * timeInSec;
      var sentry = getStorage(pid, 'sentry') || 0;
      var spyMaxReached = getStorage(pid, 'spy_max');
      if (potMoneys > tbg * MIN_TBG && sentry < MAX_SPY * getOwnStorage('spy') && 
          (spyMaxReached === undefined || (spyMaxReached !== undefined && spyMaxReached + WAIT_FOR_SPY < Date.now()))) {
        var chain = $('.table_lines').children().eq(1).children().eq(i).children().eq(1).text();
        if (chain !== 'FoD' || (chain === 'FoD' && potMoneys > tbg * MIN_FOD_TBG)) {
          highList[ref] = potMoneys;
        }
      }
    }
  }
  console.log('We have ' + Object.keys(highList).length + ' to choose from');
  // Go for the highest possible score!
  var href = '', max = 0;
  for (var i in highList) {
      if (highList[i] > max) {
        href = i;
        max = highList[i];
      }
  }
  if (href === '') return;
  setStorage(stringToNum(href), 'action', 'spy');
  window.open(href);
}
function timesArrayToSec(times) {
  var timeInSec = 0;
  for (var t = 0; t < times.length; t++) {
    timeInSec += stringToNum(times[t]) * unitToSeconds(times[t]);
  }
  return timeInSec;
}
function stringToNum(s) {
  if (s === undefined) {
    console.trace();
  }
  return parseInt(s.replace(/\D/g, '')) || 0;
}
function getFromTable(tableNum, row, child) {
  return $('.table_lines').children().eq(tableNum).children().eq(row).children().eq(child).text();
}
function checkForGold() {
  var gold = stringToNum($('.menu_cell_repeater_vert table:first tr:first td:first font').text().trim()); 
  if (gold > MAX_GOLD) {
    if (window.location.pathname === '/armory.php') {
      onArmory();
    } else if (window.location.pathname === '/mercs.php') {
      onMercs(); 
    } else {
      goToUrl('mercs.php');      
    }
    return true;
  }
  return false;
}
function goToUrl(link) {
  window.location.href = 'http://www.kingsofchaos.com/' + link;
}
function purchase(gold) {
  var form_tbody = $('form[name=\'buyform\'] table:first tbody:first');
  for (var i = 0; i < 32; i++) { // 32 tr's
    var tr = $(form_tbody).children().eq(i);
    if ($(tr).children().eq(0).html().trim() === DEFAULT_BUY) {
      var price = stringToNum($(tr).children().eq(2).html().trim().replace(' Gold', ''));
      var amount = Math.floor(gold / price);
      $(tr).children().eq(3).children().eq(0).val(amount);
      break;
    }
  }
  $(form_tbody).children().last().find('input').click();
}
function onArmory() {
  var gold = stringToNum($('.menu_cell_repeater_vert table:first tr:first td:first font').text().trim());  
  if ($('input[name=\'repair_all_weapons\']').length !== 0 && stringToNum($('input[name=\'repair_all_weapons\']').val().replace(/\.\d+/g, '')) < gold) {
    $('input[name=\'repair_all_weapons\']').click();
  } else if (gold > MAX_GOLD) {
    purchase(gold);
  } else {
    $('#bSelfUpdate').click();
    closeTab();
  }
}
function onMercs() {
  var gold = stringToNum($('.menu_cell_repeater_vert table:first tr:first td:first font').text().trim());
  var trainedMercCost = stringToNum(getFromTable(2, 2, 1));
  var untrainedMercCost = stringToNum(getFromTable(2, 4, 1));
  var availableUntrainedMercs = stringToNum(getFromTable(2, 4, 2));
  var availableAttackMercs = stringToNum(getFromTable(2, 2, 2));
  var untrainedMercs = stringToNum(getFromTable(1, 6, 1));
  var attackMercs = stringToNum(getFromTable(1, 2, 1));
  var defenseMercs = stringToNum(getFromTable(1, 4, 1));
  var totalMercs = untrainedMercs + attackMercs + defenseMercs;
  var totalForce = stringToNum(getFromTable(1, 10, 1));
  var percentageUntrained = untrainedMercs / (totalForce - totalMercs);
  var percentageAttack = attackMercs / (totalForce - totalMercs);
  var buyUntrainedMercs = 0, buyAttackMercs = 0;
  if (availableUntrainedMercs > 0 && percentageUntrained < MIN_MERCS) {
    var maxUntrainedMercs = MAX_MERCS * (totalForce - untrainedMercs);
    availableUntrainedMercs = Math.min(availableUntrainedMercs, gold / untrainedMercCost);
    buyUntrainedMercs = Math.floor(Math.min(maxUntrainedMercs - untrainedMercs, availableUntrainedMercs));
    gold = gold - buyUntrainedMercs * untrainedMercCost;
    $('input[name="mercs[general]"]').val(Math.floor(buyUntrainedMercs));
  }
  if (availableAttackMercs > 0 && percentageAttack < MIN_MERCS) {
    var maxAttackMercs = MAX_MERCS * (totalForce - attackMercs);
    availableAttackMercs = Math.min(availableAttackMercs, gold / trainedMercCost);
    buyAttackMercs = Math.floor(Math.min(maxAttackMercs - attackMercs, availableAttackMercs));
    $('input[name="mercs[attack]"]').val(Math.floor(buyAttackMercs));   
  }
  if (buyUntrainedMercs + buyAttackMercs > 0) {
    $('input[value="Buy"]').click();    
  }
 goToUrl('armory.php');
}
function checkTurns() {
  var turns = stringToNum($('.menu_cell_repeater_vert table:first tr').eq(2).find('td:last font').text());
  if (turns !== 0 && turns < 150) {
    console.debug('Not enough turns! Only ' + turns);
    closeTab();
  }
}
function deleteFarmInfo() {
  for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.replace(/\D/g, '').length === k.length) { // Must be pid
        delete localStorage[k];
      }
    }
}
function unitToSeconds(unit) {
  var second = 1;
  var minute = second * 60;
  var hour = minute * 60;
  var day = hour * 24;
  var week = day * 7;
  var month = day * 30; // Incorrect, who cares
  if (unit.indexOf('second') > - 1) {
    return second;
  } else if (unit.indexOf('minute') > - 1) {
    return minute;
  } else if (unit.indexOf('hour') > - 1) {
    return hour;
  } else if (unit.indexOf('day') > - 1) {
    return day;
  } else if (unit.indexOf('week') > - 1) {
    return week;
  } else if (unit.indexOf('month') > - 1) {
    return month;
  }
  return - 1; // Should not happen
}
function updateParameterValues() {
  DEFAULT_BUY = $('#DEFAULT_BUY').val();
  MIN_ATTACK_GOLD = parseInt($('#MIN_ATTACK_GOLD').val());
  localStorage['DEFAULT_BUY'] = $('#DEFAULT_BUY').val();
  localStorage['MIN_ATTACK_GOLD'] = parseInt($('#MIN_ATTACK_GOLD').val());
  console.debug('We have changed the values DEFAULT_BUY and MIN_ATTACK_GOLD to ', DEFAULT_BUY, 'and', MIN_ATTACK_GOLD);
  return false;
}
function insertParameterInputs() {
  $('table:first tr:first td:first').prepend($('<script>' + updateParameterValues.toString() + deleteFarmInfo.toString() + '</script><form style="width: 350px; float: left; margin-top: 20px; text-align: left;"><table><tbody><tr><td><label>DEFAULT BUY</label></td><td style="float: right;"><input id="DEFAULT_BUY" name="DEFAULT_BUY" type="text" value="'
  + DEFAULT_BUY + '"></td></tr><tr><td><label>MIN ATTACK GOLD</label></td><td style="float: right;"><input id="MIN_ATTACK_GOLD" name="MIN_ATTACK_GOLD" type="text" value="'
  + MIN_ATTACK_GOLD + '"></td></tr><tr><td><input value="Update" onclick="return updateParameterValues();" type="submit"></td><td><input value="Clear cache" onclick="return deleteFarmInfo();" type="submit"></td></tr></tbody></table></form>'
  ));
}
