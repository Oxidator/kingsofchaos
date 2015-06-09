// ==UserScript==
// @name        War Sab
// @include     http://www.kingsofchaos.com/attack.php*
// @include     http://www.srforums.net/baigo/script/war/sablist.php?user=Oxidator*
// @include     http://www.kingsofchaos.com/base.php
// @include     http://www.kingsofchaos.com/inteldetail.php*
// @require     http://code.jquery.com/jquery-latest.js
// @version     1
// @grant       none
// ==/UserScript==
var RELOAD_INTERVAL = 45000; // 45 sec
var T_DAY = 24 * 60 * 60 * 1000; // Day in milisecs
var SAB_MUL = 2 // times spy level
var NUM_SPIES_FIRST = 1;
var NUM_SPIES_SECOND = 2;
var MIN_FAILS = 3;
var MINIMUM_VALUE = 10000000;
var WEAPON_VALUES = {"Broken Stick" : 100, "Knife" : 1000, "Scimitar" : 10000, "Dragon Claw" : 200000, "Chariot" : 450000, "Blackpowder Missile" : 1000000, 		
"Helmet" : 2000, "Shield" : 5000, "Chainmail" : 10000, "Plate Armor" : 25000, "Mist Veil" : 50000, "Dragonskin" : 200000, "Invisibility Shield" : 1000000, 
"Rope" : 40000, "Dirk" : 75000, "Cloak" : 140000, "Grappling Hook" : 250000, "Skeleton Key" : 600000, "Nunchaku" : 1000000, 		
"Big Candle" : 40000, "Horn" : 75000, "Tripwire" : 140000, "Guard Dog" : 250000, "Lookout Tower" : 1000000};
var DIRECTION = getOwnStorage('DIRECTION') || 1; // 1 is next, 0 previous

var interval = setInterval(function () {
  refreshPage();
}, RELOAD_INTERVAL);
function refreshPage() {
  if ($.inArray(window.location.pathname, [
    '/base.php',
    '/baigo/script/war/sablist.php'
  ]) >= 0) {
    window.location.reload();
  } else {
    closeTab();
  }
}
$(document).ready(function () {
  if (window.location.pathname == '/baigo/script/war/sablist.php') {
    console.log($('th.subh'));
    if ($('th.subh').length === 0) {
      setOwnStorage('DIRECTION', 1 - DIRECTION);
      window.history.back();
    } else {
      onSabList();
    }
  } else if (window.location.pathname == '/base.php') {
    onBase();
  } else if (window.location.pathname == '/attack.php') {
    onAttack();
  } else if (window.location.pathname == '/inteldetail.php') {
    onInteldetail();
  }
});
function onSabList() {
  var spy = stringToNum($('.table_lines:first tr:first th:first').text());
  var trs = $('.table_lines:first tr');
  var foundTarget = false;
  for (var i = 4; i < trs.length - 1; i++) {
    var href = $(trs).eq(i).children().eq(2).find('a:last').attr('href');
    var sentry = stringToNum($(trs).eq(i).children().eq(3).clone().children().remove().end().text());
    var suggested = $(trs).eq(i).children().eq(4).text().trim();
    var last = $(trs).eq(i).children().eq(5).clone().children().remove().end().text().trim();
    var check = $(trs).eq(i).children().eq(2).find('img:last').attr('src') === '/baigo/script/images/check.gif';
    var maxed = $(trs).eq(i).children().eq(2).text().indexOf('Maxed') >= 0;
    var currentAction = getStorage(stringToNum(href), 'action');
    var lastWeapon = last.replace(/\d/g, '').trim();
    if (sentry < spy * SAB_MUL && last !== 'Never' && !check && currentAction !== 'sab' &&
       stringToNum(last) * WEAPON_VALUES[lastWeapon] >= MINIMUM_VALUE){
      var timespan = $(trs).eq(i).children().eq(2).find('span:last');
      if (maxed || timespan.length === 0 || timesArrayToSec($(timespan).attr('title').split(', ')) >= T_DAY) {
        console.log('Attacking ' + stringToNum(href) + ' where last sab was ' + stringToNum(last) + ' of ' + lastWeapon);
        setStorage(stringToNum(href), 'action', 'sab'); // Only do this once
        window.open(href);
        foundTarget = true;
        break;
      }
    }
  }
  if (!foundTarget) {
    switchPage();
  }
}
function switchPage() {
  console.log('Switching page in direction ' + DIRECTION);
  var link = $('tr').eq(2).children().eq(DIRECTION).find('a').eq(0);
  if (link.length === 0) {
    setOwnStorage('DIRECTION', 1 - DIRECTION);
  } else { // Delete all pid storage
    for (var i = 0; i < sessionStorage.length; i++) {
      var k = sessionStorage.key(i);
      console.log(k);
      if (k.replace(/\D/g, '').length === k.length) { // Must be pid
        console.log('deleting ' + k);
        delete sessionStorage[k];
      }
    }
    window.location = $(link).attr('href');
  }
}
function onBase() {
  var spy = stringToNum(getFromTable(8, 3, 1));
  setOwnStorage('spy', spy);
}
function onAttack() {
  var pid = stringToNum($('.table_lines').eq(3).find('a').attr('href'));
  if ($('td.content h3').text().indexOf('Error') >= 0) {
    console.log("This user no longer exists " + window.location);
    closeTab();
  }
  var ival = setInterval(function () {
    var priorTd = $('.table_lines').children().eq(5).children().eq(7).children().eq(1);
    if ($(priorTd).text() === 'Never' || $(priorTd).find('button').length > 0) {
      clearInterval(ival);
      var warning = $('td.content font[color="red"]:first').text().trim();
      var sentry = stringToNum(getFromTable(2, 4, 1));
      if ($(priorTd).text() === 'Never' || sentry > getOwnStorage('spy') * SAB_MUL) {
        closeTab();
      } else {
        $('input[value=\'Sab!\']:last').prop('onclick', 'return true;');
        var weapon = $(priorTd).find('button').attr('weapon').trim();
        var options = $('.table_lines').children().eq(5).children().eq(2).find('select option');
        for (var i = 0; i < options.length; i++) {
          if ($(options).eq(i).attr('label') === weapon) {
            $(options).eq(i).parent().val($(options).eq(i).attr('value'));
            break;
          }
        }
        var numWeapons = stringToNum($(priorTd).find('button').text());
        var numSpies = NUM_SPIES_FIRST;
        if (sentry > getOwnStorage('spy') || getStorage(pid, 'fails') > MIN_FAILS) {
          numSpies = NUM_SPIES_SECOND;
        }
        $('input[name=\'numspies\']:last').val(numSpies);
        if (warning === '') {
          $('input[name=\'numsab\']:last').val(numWeapons);
          $('input[value=\'Sab!\']:last').click();
        } else if (warning === 'Your opponent has already suffered heavy losses today, and his sentry force is on full alert. Your sabotage will not succeed until they let their guard down.') {
          closeTab();
        } else if (warning === 'Your officers inform you that you will never be able to get away with sabotaging that much of an opponent\'s armory.') {
          //var sabbed = parseInt($('input[name=\'numsab\']:last').val());
          //$('input[name=\'numsab\']:last').val(sabbed - 1);
          $('input[value=\'Sab!\']:last').click();
        } else if (warning === 'You can use a maximum of 10 successful sab turns against a player every 24 hours.') {
          closeTab();
        } else if (warning === 'You may not sabotage less than 1 weapon.') {
          console.log(warning, weapon, numWeapons);
          closeTab();
        } else {
          console.log(warning);
          closeTab();
        }
      }
    }
  }, 100);
}
function onInteldetail() {
  var report = $('table').eq(2).find('tr:first td.content p:first').text();
  if (report.indexOf('successfully') === -1) {
     var pid = $('td.content input:first').attr('value');
     incrementStorage(pid, 'fails');
  } else {
     setStorage(pid, 'fails', 0);
  }
  $('input[value="Attack / Spy Again"]').click();
}
function getOwnStorage(attr) {
  return sessionStorage[attr];
}
function setOwnStorage(attr, val) {
  sessionStorage[attr] = val;
}
function incrementStorage(pid, attr) {
  var original = parseInt(getStorage(pid, attr)) || 0;
  setStorage(pid, attr, original + 1);
}
function getStorage(pid, attr) {
  var s = sessionStorage[pid];
  if (s === null || s === undefined || s === '')
  return {
  };
  var obj = JSON.parse(s);
  if (attr !== undefined)
  return obj[attr];
  return obj;
}
function setStorage(pid, attr, val) {
  var obj = getStorage(pid);
  obj[attr] = val;
  if (attr === 'action' && val === 'sab')
    obj.timestamp = Date.now();
  sessionStorage[pid] = JSON.stringify(obj);
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
function closeTab() {
  console.log('Closing this tab: ' + window.location);
  console.trace();
  window.close();
}
function timesArrayToSec(times) {
  var timeInSec = 0;
  for (var t = 0; t < times.length; t++) {
    timeInSec += stringToNum(times[t]) * unitToSeconds(times[t]);
  }
  return timeInSec;
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
