// global value for active spreadsheet
var ss = SpreadsheetApp.getActiveSpreadsheet();
// creates the menu option to run the script onOpen
function onOpen() {
  ui = SpreadsheetApp.getUi()
  ui.createMenu("Sync")
    .addItem("gSync", "gData")
    .addItem("gClear", "gClearData")
    .addItem("oSync", "oData")
    .addItem("oClear", "oClearData")
    .addToUi();
}
// clears out previous guild contents for a full refresh, if new data has fewer rows than the last update some will remain, use this to clean it up.
function gClearData() {
  ss.getSheetByName("CharCopy").getRange("A2:L").clearContent();
  ss.getSheetByName("GChars").getRange("A2:L").clearContent();
  ss.getSheetByName("GShips").getRange("A2:F").clearContent();
}
// clears out previous opponent contents for a full refresh, if new data has fewer rows than the last update some will remain, use this to clean it up.
function oClearData() {
  ss.getSheetByName("oChars").getRange("A2:K").clearContent();
  ss.getSheetByName("oShips").getRange("A2:F").clearContent();
}
// grabs the # for whatever guild is in the list
function getGuildID(string) {
  return /swgoh.gg\/g\/(\d+)/.exec(string)[1];
}
// fills a sheet by title, tab, with values from a 2d array, values, in Row, Col
function fillsheet(tab, values, row, col) {
  sheet = ss.getSheetByName(tab);
  cells = sheet.getRange(row, col, values.length, values[0].length);
  cells.setValues(values);
}
// fills the GP sheet & CharCopy so that all the formulas in UST don't try to auto fill, causes time outs, copy / paste from CharCopy to GChars
function gData() {
  // get the current character set from swgoh.gg
  var allCharInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/characters/"));
  
  // get the current ship set from swgoh.gg
  var allShipInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/ships/"));

  // get the link for the guild from Setup(11,3)
  var guildLink = ss.getSheetByName("Setup").getRange(3,11).getValue();

  // get the guild data from swgoh.gg/api
  var guildInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/guild/"+getGuildID(guildLink)+"/"));
  
  // fill GP sheet with guild data
  // [plyrName], [totalGP], [charGP], [shipGP], [zetaCount]
  fillsheet('GP', setupGP(guildInfo)[1], 2, 1);

  // fill CharCopy with guildInfo so it doesn't cause all of the formulas to break the sheet
  // [Character Name] [Player Name] [Power] [gpPercent] [Stars] [G.L.] [Level] [Zeta1] [Zeta2] [Zeta3] [Zeta4] [Zeta5]
  fillsheet('CharCopy', setupChars(allCharInfo, guildInfo), 2, 1);

  // fill GShips with guildInfo
  // [Ship Name] [Pyaler Name] [Power] [gpPercent] [Stars] [Level]
  fillsheet('GShips', setupShips(allShipInfo, guildInfo), 2, 1);
}
// opponent data function
function oData() {
  // get the current character set from swgoh.gg
  var allCharInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/characters/"));
  
  // get the current ship set from swgoh.gg
  var allShipInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/ships/"));

  // get the link for the opponents guild from Setup(4,11)
  var oppLink = ss.getSheetByName("Setup").getRange(4,11).getValue();

  // get the opponents data from swgoh.gg/api
  var oppInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/guild/"+getGuildID(oppLink)+"/")); 

  // fill UST V1-50 with opponent names
  fillsheet('UST', setupGP(oppInfo)[0], 1, 22);

  // fill OChars with oppInfo
  // [Character Name] [Player Name] [Power] [gpPercent] [Stars] [G.L.] [Level] [Zeta1] [Zeta2] [Zeta3] [Zeta4] [Zeta5]  
  fillsheet('OChars', setupChars(allCharInfo, oppInfo), 2, 1);
  
  // fill OShips with oppInfo
  // [Ship Name] [Pyaler Name] [Power] [gpPercent] [Stars] [Level]
  fillsheet('OShips', setupShips(allShipInfo, oppInfo), 2, 1); 
}
// takes in a json obj and return a 2d array with [0] = [plyrName] &  [plyrName], [totalGP], [charGP], [shipGP], [zetaCount]
function setupGP(guildInfo) {
    // container for both Name and Data arrays
    var plyrContnr = [];
    // collect player names
    var plyrNames = [];
    // collect player data
    var plyrStats = [];
    // temp var for zeta counts per player
    var zetaCntr = 0
    // get each players info and their zeta counts
    for (var plyr in guildInfo['players']) {
      // add player names to array, guildInfo['players'][plyr]['data']['name']
      plyrNames.push([guildInfo['players'][plyr]['data']['name']]);
      
      // count up the zetas
      for (var plyrUnit in guildInfo['players'][plyr]['units']) {
        zetaCntr += guildInfo['players'][plyr]['units'][plyrUnit]['data']['zeta_abilities'].length;
      }
      
      // finish plyrStats array format [plyrName], [totalGP], [charGP], [shipGP], [zetaCount]
      plyrStats.push([guildInfo['players'][plyr]['data']['name'], guildInfo['players'][plyr]['data']['galactic_power'], guildInfo['players'][plyr]['data']['character_galactic_power'], guildInfo['players'][plyr]['data']['ship_galactic_power'], zetaCntr]);
      zetaCntr = 0;
    }    
    // make sure both arrays have 50 entries even if blank to overide previous items in the cells
    while (plyrNames.length < 50) {
      plyrNames.push([""]);
    }
    while (plyrStats.length < 50) {
      plyrStats.push(["","","","",""]);
    }

    // add both arrays to our container [0] = Names, [1] = Stats
    plyrContnr.push(plyrNames);
    plyrContnr.push(plyrStats);

    return plyrContnr
}
// refactored GChars page, need to figure out GP percentage now with relics, pull the base stats for characters from api and check it out. Base line with mods per relic tiers?
function setupChars(allCharInfo, guildInfo) {
  // setup container array
  gCharContnr = []
  // lead ability tracker
  leadContnr = []
  // adds guild data, guildInfo, to array for every character in the game, allCharInfo
  for (var char in allCharInfo) {
    for (var plyr in guildInfo.players) {
      // need another level for every character in a player
      for (var pUnit in guildInfo.players[plyr].units) {
        // GP percentage is based off of G13 power and if it = 100 than swap to Relic tier
        // I would prefer that this be the case but the value returned from the API is a representation of R13 & 6dot mods, so leaving it as a simple %
        // if the player's unit name matches our current search set the gpPercentage and break out of the loop
        if (guildInfo.players[plyr].units[pUnit].data.name == allCharInfo[char].name) {
          var gpPercent = (guildInfo.players[plyr].units[pUnit].data.power / allCharInfo[char].power).toFixed(5);

          // if is_zeta true then add name to list, normalize list with empty values to 5, add each to push, used to be handled seperately
          // create zeta container
          zetaContnr = [];
          for (var charAbility in guildInfo.players[plyr].units[pUnit].data.ability_data) {
            if (guildInfo.players[plyr].units[pUnit].data.ability_data[charAbility].is_zeta == true) {
              zetaContnr.push(guildInfo.players[plyr].units[pUnit].data.ability_data[charAbility].name);
            }
            // also check for lead abilities for the Leads tab
            if ((guildInfo.players[plyr].units[pUnit].data.ability_data[charAbility].id).indexOf("leaderskill") > -1) {
              // add check for unique values
              var leadChkr = 0;
              if (leadContnr.length == 0) {
                leadContnr.push([ guildInfo.players[plyr].units[pUnit].data.ability_data[charAbility].name ]);
              } else {
                for (var leadAbility in leadContnr) {
                  if (leadContnr[leadAbility][0].indexOf(guildInfo.players[plyr].units[pUnit].data.ability_data[charAbility].name) > -1) {
                    leadChkr = 1
                  }
                }
                if (leadChkr == 0) {
                  leadContnr.push([ guildInfo.players[plyr].units[pUnit].data.ability_data[charAbility].name ]);
                }
              }
              
            }
          }

          // normalize the zetaContnr to 5 entries
          if (zetaContnr.length < 5) {
            for (zetaCntr = zetaContnr.length; zetaCntr < 5; zetaCntr++) {
              zetaContnr.push("");
            }
          }
          
          // probably need to push in all values here after gpPercent is set
          gCharContnr.push( [ allCharInfo[char].name, guildInfo.players[plyr].data.name, guildInfo.players[plyr].units[pUnit].data.power, gpPercent, guildInfo.players[plyr].units[pUnit].data.rarity, guildInfo.players[plyr].units[pUnit].data.gear_level, guildInfo.players[plyr].units[pUnit].data.level, zetaContnr[0], zetaContnr[1], zetaContnr[2], zetaContnr[3], zetaContnr[4] ] );
          // move on to next player
          break;
        }
      }
    }
  }
  // fill in the lead abilities since we're not returning it in our variable
  fillsheet('Leads', leadContnr, 1, 1);

  return gCharContnr;
}
// now we need all the ship data, pretty much the same thing as Chars with some differences in the amount of data available
// [Ship Name], [Player Name], [Power], [gpPercent], [Stars], [Level]
function setupShips(allShipInfo, guildInfo) {
  // setup container array
  gShipContnr = []
  // adds guild data, guildInfo, to array for every character in the game, allShipInfo
  for (var ship in allShipInfo) {
    for (var plyr in guildInfo.players) {
      // need another level for every character in a player
      for (var pUnit in guildInfo.players[plyr].units) {
        // The value returned from the API for GP is a representation of R13 & 6dot mods, so leaving it as a simple %
        // if the player's unit name matches our current search set the gpPercentage and break out of the loop
        if (guildInfo.players[plyr].units[pUnit].data.base_id == allShipInfo[ship].base_id) {
          var gpPercent = (guildInfo.players[plyr].units[pUnit].data.power / allShipInfo[ship].power).toFixed(5);

          // need to push in all values here after gpPercent is set
          gShipContnr.push( [ allShipInfo[ship].name, guildInfo.players[plyr].data.name, guildInfo.players[plyr].units[pUnit].data.power, gpPercent, guildInfo.players[plyr].units[pUnit].data.rarity, guildInfo.players[plyr].units[pUnit].data.level ] );
          // move on to next player
          break;
        }
      }
    }
  }
  return gShipContnr;
}