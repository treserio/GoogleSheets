// global value for active spreadsheet
var ss = SpreadsheetApp.getActiveSpreadsheet();
// creates the menu option to run the script onOpen
function onOpen() {
  ui = SpreadsheetApp.getUi()
  ui.createMenu("Sync")
    .addItem("gSync", "gData")
    .addToUi();
}
// grabs the # for whatever guild is in the list
function getGuildID() {
  var site = ss.getSheetByName("Defense").getRange(1,2).getValue();
  return /swgoh.gg\/g\/(\d+)/.exec(site)[1];
}
// fills a sheet by title, tab, with values from a 2d array, values
function fillsheet(tab, values) {
  sheet = ss.getSheetByName(tab);
  cells = sheet.getRange(2,1,values.length, values[0].length);
  cells.setValues(values);
}
// function to match 2 values in a 2D array
function getIndex2var(arr, val1, val2) {
  for (var key in arr) {
    var index = arr[key].indexOf(val1);
    if (index > -1) {
      var index2 = arr[key].indexOf(val2);
      if (index2 > -1) {
        return key
      }
    }
  }
}
// function to normalize the secondary length of the data array
function normArray (arry) {
  for (entry in arry) {
    while (arry[entry].length < 12) {
      arry[entry].push('');
    }
  }
}
// pulls information from api, and guild zeta page on swgoh.gg and parses into an array to populate ss
function gData() {
  // characters {base_id={level, gear_level, combat_type, power, url, rarity=stars, player}}
  // ships {player, rarity=stars, combat_type, power, level}
  var gunits = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/guilds/"+getGuildID()+"/units/").getContentText());
  // {image = url, base_id = name no space, name = proper name, description = flavor text, combat_type = int, pk= int(80?), power = maxpwr, url=charpage}
  var charList = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/characters/?format=json").getContentText());
  // {name, base_id, url, image, power, description}
  var shipList = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/ships/?format=json").getContentText());
  // collection of sorted items
  var data = [];
  var plyrArray = [];
  // google sheet variables
  var sheet, cells;

  // adds guild data, gunits, to array for every character in the game, charList
  for (var char in charList) {
    for (var plyr in gunits[charList[char]['base_id']]) {
      // find percent completion of player's unit
      var gpPercent = (gunits[charList[char]['base_id']][plyr].power / charList[char].power).toFixed(5);
      data.push( [charList[char]['name'], gunits[charList[char]['base_id']][plyr].player, gunits[charList[char]['base_id']][plyr].power, gpPercent, gunits[charList[char]['base_id']][plyr].rarity, gunits[charList[char]['base_id']][plyr].gear_level, gunits[charList[char]['base_id']][plyr].level] );
      if (plyrArray.indexOf(gunits[charList[char]['base_id']][plyr].player) === -1) {
        plyrArray.push(gunits[charList[char]['base_id']][plyr].player);
      }
    }
  }
  // format plyrArray for fillsheet() which requires 2d array
  for (name in plyrArray) {
    plyrArray[name] = [plyrArray[name]]
  }
  // zetas aren't available through the api so they must be collected through a fetch of the guild zeta page, and then parsing the data
  // looks at the ss and finds the correct url for the guild listed in the appropriate cell
  var site = ss.getSheetByName("Defense").getRange(1,2).getValue() + "zetas/";
  // fetch guild zeta page from swgoh.gg
  var html = UrlFetchApp.fetch(site).getContentText();
  // Final array of [plyr, char, [zetas]]
  var fullValues = [];
  // regex to grab rows from the guild zeta table, each row is a new player
  // [0]=row data, [1]=player name
  var rowRegex = /<td data-sort-value="(.*?)"[\s\S]*?<\/tr>/g
  // iterate through the html and pull out rows to sort through until there are no more rows to find
  var currentRow;
  while ( (currentRow=rowRegex.exec(html) ) !== null ) {
    // capture players name in value
    var plyr = currentRow[1];
    // following regex values must be reinitialized to reset their counter for each instance of the loop.
    // grab character names and zeta lists for each from currentRow[0]
    // [1]=character name, [2]=zeta list of character
    var charRegex = new RegExp ('zeta-character">[\\s\\S]+?title="(.*?)"[\\s\\S]+?zeta-abilities">([\\s\\S]+?)<\\/div>\\s<\\/div>','g');  
    // regex to grab zeta names from charRegex[2], two capture groups are required so that it will capture each instance of the occurance in the text
    // [1]=each title string, [2]=Zeta Title
    var zetaTitle = new RegExp ('(title="(.*?)">)','g');
    // iterate through the row until there are no more characters in the row
    var character;
    while ( (character = charRegex.exec(currentRow[0]) ) !== null) {
      // capture character name in value
      var char = character[1].replace(/&quot;/g,'"').replace(/&#39;/g,"'");
      var plchldr = [];
      var zTitles;
      while ( (zTitles = zetaTitle.exec(character[2]) ) !== null) {
        plchldr.push(zTitles[2].replace(/&quot;/g,'"').replace(/&#39;/g,"'"));
      }
      // each character through needs to have a plyr name, char name, and zeta list array
      // [x] Set, [x][0] plyr, [x][1] char, [x][2] zeta array
      fullValues.push([plyr, char, plchldr]);
    }
  }
  // add zetas to the correct characters in the guild's data
  for (var zeta in fullValues) {
    // find the index of the correct character
    var arrIndex = getIndex2var(data, fullValues[zeta][0], fullValues[zeta][1]);
    // push all zeta titles into data
    for (var zTitle in fullValues[zeta][2]) {
      data[arrIndex].push(fullValues[zeta][2][zTitle]);
    }
  }
  // normalize the size of the array so it can pass .setValues
  normArray(data);
  // fill GChars sheet with data
  fillsheet('GChars', data);
  // fill GValues sheet with player list
  fillsheet('GValues', plyrArray);
  // reset data for ships 
  data = [];
  // Sets all guild Ship data and populates appropriate sheet
  for (var ship in shipList) {
    for (var plyr in gunits[shipList[ship]['base_id']]) {
      var gpPercent = (gunits[shipList[ship]['base_id']][plyr].power / shipList[ship].power).toFixed(5)*100;
      data.push( [shipList[ship]['name'], gunits[shipList[ship]['base_id']][plyr].player, gunits[shipList[ship]['base_id']][plyr].power, gpPercent, gunits[shipList[ship]['base_id']][plyr].rarity, gunits[shipList[ship]['base_id']][plyr].level] );
    }
  }
  // fill GShips sheet with data
  fillsheet('GShips', data);
}