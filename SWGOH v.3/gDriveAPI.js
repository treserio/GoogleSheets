// global value for active spreadsheet
var ss = SpreadsheetApp.getActiveSpreadsheet();

// creates the menu option to run the script onOpen
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('TW Planner')
        .addItem('Team Generator', 'teamGenerator')
        .addItem('Update Guilds', 'updateGuilds')
        .addToUi();
}

// creates a copy of the source file by ID and then removes the original file, since I can't find a way to add files to specific folders just yet
// needs to check if the file name already exists in the target folder and remove that file because moving it won't overwrite it.
function moveFiles(sourceFileId, targetFolderId) {
    var mover = DriveApp.getFileById(sourceFileId);
    var destFolder = DriveApp.getFolderById(targetFolderId);
    // before adding the file check if one exists, since moving one fails to over write the existing file
    destFileIter = destFolder.getFilesByName(mover.getName());
    while (destFileIter.hasNext()) {
        currentFile = destFileIter.next()
        if (currentFile.getName() == mover.getName()) {
            // destFolder.removeFile(currentFile);
            currentFile.setTrashed(true);
        }
    }
    // copy the new version of the file to the dest folder
    destFolder.addFile(mover);
}

function getDriveJSON(gId) {
    // check if the requested JSON is all info, and run func to check last updated date, saving if older than 1 day, else pulling from gDrive
    if (gId === 'allCharInfo' || gId === 'allShipInfo') {
        if (checkUpdate(gId)) {
            return saveToJSON(gId);
        }
    }
    // this is our content folder
    destFldrIter = DriveApp.getFoldersByName("SWGOH_DATA");
    // if the content folder doesn't exist run the saveToJSON to create one and save the JSON file into it
    if (!destFldrIter.hasNext()) {
        return saveToJSON(gId);
    }
    // fileIterator use .next() to get the actual file
    fileIter = destFldrIter.next().getFilesByName(gId + '.json');
    // need to use .hasNext() to confirm that the file exists, else create it.
    if (fileIter.hasNext()) {
        // parse json on file
        return JSON.parse(fileIter.next().getBlob().getDataAsString());
    }
    return saveToJSON(gId);
}

function saveToJSON(gId) {
    var guildInfo;
    // if the gId is one of the following aquire the appropriate json
    if (gId === 'allCharInfo' || gId === 'allShipInfo') {
        if (gId.includes('Char')) {
            guildInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/characters/"));
        } else {
            guildInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/ships/"));
        }
    } else {
        // get the guild data from swgoh.gg/api
        guildInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/guild/" + gId + "/"));
    }
    // create the new file in the root of gDrive
    var original = DriveApp.createFile(gId + ".json", JSON.stringify(guildInfo));
    // create a folder iterator to check for the expected folder
    var destIterator = DriveApp.getFoldersByName("SWGOH_DATA");
    // check if folder exists
    if (destIterator.hasNext()) {
        moveFiles(original.getId(), destIterator.next().getId());
    } else {
        Browser.msgBox("There is no 'SWGOH_DATA' folder in your Google Drive.\\nOne is being created.");
        DriveApp.createFolder("SWGOH_DATA");
        // now that the expected folder exists recreate the iterator
        destIterator = DriveApp.getFoldersByName("SWGOH_DATA");
        moveFiles(original.getId(), destIterator.next().getId());
    }
    return guildInfo;
}

function checkUpdate(gId) {
    // this is our content folder
    destFldrIter = DriveApp.getFoldersByName("SWGOH_DATA");
    // if the content folder doesn't exist run the saveToJSON to create one and save the JSON file into it
    if (!destFldrIter.hasNext()) {
        return true;
    }
    // fileIterator use .next() to get the actual file
    fileIter = destFldrIter.next().getFilesByName(gId + '.json');
    // need to use .hasNext() to confirm that the file exists, else create it.
    if (fileIter.hasNext()) {
        // check the date of the file vs today and see if the value is over a day
        return (new Date() - fileIter.next().getLastUpdated() > 24 * 60 * 60 * 1000);
    }
    return true;
}

function teamGenerator() {
    // get the links for the guilds from the Setup sheet
    var userGuild = ss.getSheetByName("Setup").getRange(3, 11).getValue();
    var oppGuild = ss.getSheetByName("Setup").getRange(4, 11).getValue();
    // all of the current character & ship units available from swgoh.gg
    // updates only after a 24 hr window has passed, stores in SWGOH_DATA
    allCharInfo = getDriveJSON('allCharInfo');
    allShipInfo = getDriveJSON('allShipInfo');
    // getGuildID will handle incorrect strings and use null for empty values, else return the guild's id
    var guildDics = {}
    if (getGuildID(userGuild)) {
        guildDics['userGuild'] = getDriveJSON(getGuildID(userGuild));
    } else {
        guildDics['userGuild'] = null;
    }
    if (getGuildID(oppGuild)) {
        guildDics['oppGuild'] = getDriveJSON(getGuildID(oppGuild));
    } else {
        guildDics['oppGuild'] = null;
    }
    // grab the teams entered by the user for processing
    var userChTeams = ss.getSheetByName("Setup").getRange(3, 2, 20, 5).getValues();
    var userShTeams = ss.getSheetByName("Setup").getRange(24, 2, 10, 8).getValues();
    var oppChTeams = ss.getSheetByName("Setup").getRange(36, 2, 4, 5).getValues();
    var oppShTeams = ss.getSheetByName("Setup").getRange(41, 2, 4, 8).getValues();
    // need to make sure dictionaries exist before running code, error on .players if null
    if (guildDics.userGuild) {
        fillSheet('Data', teamsCalc(userChTeams, guildDics.userGuild, 'characters'), 1, 3);
        fillSheet('Data', teamsCalc(userShTeams, guildDics.userGuild, 'ships'), 1, 12);
        // fill GP sheet with guild data
        // [plyrName], [totalGP], [charGP], [shipGP], [zetaCount]
        fillSheet('GP', setupGP(guildDics.userGuild), 2, 1);
    }
    if (guildDics.oppGuild) {
        fillSheet('Data', teamsCalc(oppChTeams, guildDics.oppGuild, 'characters'), 1, 24);
        fillSheet('Data', teamsCalc(oppShTeams, guildDics.oppGuild, 'ships'), 1, 33);
    }
    // all possible Char Names
    fillSheet('Data', allNames(allCharInfo), 1, 1);
    // all possible Ship Names
    fillSheet('Data', allNames(allShipInfo), 1, 2);
}

function teamsCalc(teamList, guildInfo, unitType) {
    // return value should be list of lists for fillSheet function
    var gDataPush = [];
    // val to store each units info for 50 players loop
    var info = {};
    // for all teams entered find all 50 players unit information
    for (var team of teamList) {
        // check if team[0] == '' else push all '' into gDataPush
        if (team[0] != '') {
            for (var plyr of guildInfo.players) {
                info['plyrName'] = plyr.data.name;
                // init value for leadership zeta, and GL ult
                info['lz'] = '';
                info['glU'] = '';
                for (var char in team) {
                    // set default value for the char, so if the player doesn't have them it will be blank
                    info['u' + char] = 0;
                    // confirm the unit's name was entered, else set it's info value to ''
                    if (team[char] === '') {
                        info['u' + char] = '';
                    } else {
                        // find the matching unit from player's units
                        for (var unit of plyr.units) {
                            if (team[char] === unit.data.name) {
                                // grab the length of zeta abilities for this char, needs to be in another array of arrays for container[1]
                                // check for leadership zeta
                                for (var i = 0; char == 0 && i < unit.data.ability_data.length; ++i) {
                                    if (unit.data.ability_data[i].id.includes('leaderskill') && unit.data.ability_data[i].is_zeta) {
                                        info['lz'] = "✔";
                                        break;
                                    }
                                }
                                // check for GL and Ult .data.has_ultimate T/F
                                if (unit.data.has_ultimate) {
                                    info['glU'] = "✔";
                                }
                                // add zeta counter here, return list of 2 items 2nd being zeta?
                                // check if the unitType is characters else ships, set allData to appropriate info
                                var allData;
                                if (unitType === 'characters') {
                                    allData = allCharInfo;
                                } else {
                                    allData = allShipInfo;
                                }
                                // locate correct character to set player's completion % for that char
                                for (var charInfo of allData) {
                                    if (team[char] === charInfo.name) {
                                        info['u' + char] = (unit.data.power / charInfo.power).toFixed(5);
                                        // info['u' + char] = unit.data.name;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                // push correctly formated rows for chars & ships respectfully, 9 chars, 12 ships
                if (unitType === 'characters') {
                    gDataPush.push([
                        info.plyrName,
                        teamAvg(info),
                        info.lz,
                        info.glU,
                        info.u0,
                        info.u1,
                        info.u2,
                        info.u3,
                        info.u4
                    ])
                } else {
                    gDataPush.push([
                        info.plyrName,
                        teamAvg(info),
                        info.lz,
                        info.glU,
                        info.u0,
                        info.u1,
                        info.u2,
                        info.u3,
                        info.u4,
                        info.u5,
                        info.u6,
                        info.u7
                    ])
                }
            }
        } else {
            // enter blank data for teams that don't have a leader, assumes the rest of members are also absent, 9 por characters, 12 for ships
            if (unitType === 'characters') {
                for (var i = 0; i < 50; ++i) {
                    gDataPush.push(['', '', '', '', '', '', '', '', '']);
                }
            } else {
                for (var i = 0; i < 50; ++i) {
                    gDataPush.push(['', '', '', '', '', '', '', '', '', '', '', '']);
                }
            }
        }
        // if gDataPush % 50 add rows till it is to ensure correct placement of new teams for guilds with < 50 members
        if (gDataPush.length % 50) {
            if (unitType === 'characters') {
                for (var i = gDataPush.length; i % 50; ++i) {
                    gDataPush.push(['', '', '', '', '', '', '', '', '']);
                }
            } else {
                for (var i = gDataPush.length; i % 50; ++i) {
                    gDataPush.push(['', '', '', '', '', '', '', '', '', '', '', '']);
                }
            }
        }
    }
    return gDataPush;
}

function updateGuilds() {
    // get the link for the guilds from Setup(11,3) & (4, 11)
    var userGuild = ss.getSheetByName("Setup").getRange(3, 11).getValue();
    var oppGuild = ss.getSheetByName("Setup").getRange(4, 11).getValue();

    // confirm urls are correct with getGuildID and save their json to SWGOH_DATA
    if (getGuildID(userGuild)) {
        saveToJSON(getGuildID(userGuild));
    }

    if (getGuildID(oppGuild)) {
        saveToJSON(getGuildID(oppGuild));
    }
}

// grabs the # for whatever guild is in the list
function getGuildID(gUrl) {
    // if something was entered in the guild url locations
    if (gUrl) {
        // if the text isn't a valid swgoh.gg url throw error
        if (!/swgoh.gg\/g\/(\d+)/.exec(gUrl)) {
            throw 'Please enter a valid sswgoh.gg guild url in K3 & K4, or leave either blank.';
        } else {
            // return the guild's id from the url
            return /swgoh.gg\/g\/(\d+)/.exec(gUrl)[1];
        }
    }
}

// find the average percentage of variable length teams
function teamAvg(info) {
    for (var i = 0, cntr = 0, sum = 0; i < 8; ++i) {
        // confirm item in info exists, and is a valid number
        if (info.hasOwnProperty('u' + i) && info['u' + i] !== '') {
            sum += parseFloat(info['u' + i]);
            ++cntr;
        }
    }

    return (sum / cntr);
}

// takes in a json obj and return a 2d array with [0] = [plyrName] &  [plyrName], [totalGP], [charGP], [shipGP], [zetaCount]
function setupGP(guildInfo) {
    // collect player data
    var plyrStats = [];
    // temp var for zeta counts per player
    var zetaCntr;
    // get each players info and their zeta counts
    for (var plyr of guildInfo.players) {
        zetaCntr = 0;
        // count up the zetas
        for (var unit of plyr.units) {
            zetaCntr += unit.data.zeta_abilities.length;
        }
        // plyrStats array format [plyrName], [totalGP], [charGP], [shipGP], [zetaCount]
        plyrStats.push([
            plyr.data.name,
            plyr.data.galactic_power,
            plyr.data.character_galactic_power,
            plyr.data.ship_galactic_power,
            zetaCntr
        ]);
    }
    // make sure the array has 50 entries even if blank to overide previous items in the cells
    while (plyrStats.length < 50) {
        plyrStats.push(["", "", "", "", ""]);
    }

    return plyrStats;
}

// returns a list of lists of one string, so the fillSheets function works correctly
function allNames(allData) {
    var rtrnList = [];
    for (var unit of allData) {
        var innerList = [];
        innerList.push(unit.name);
        rtrnList.push(innerList);
    }
    return rtrnList;
}

// fills a sheet by title, tab, with values from a 2d array, values, in Row, Col
function fillSheet(tab, values, row, col) {
    sheet = ss.getSheetByName(tab);
    cells = sheet.getRange(row, col, values.length, values[0].length);
    cells.setValues(values);
}
