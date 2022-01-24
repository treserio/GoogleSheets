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
    // get the guild data from swgoh.gg/api
    var guildInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/guild/" + gId + "/"));
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

function teamGenerator() {
    // all of the current character & ship units available from swgoh.gg
    // set into function to save into SWGOH_DATA folder and check for todays date on last updated or created
    allCharInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/characters/"));
    allShipInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/ships/"));
    // get the links for the guilds from the Setup sheet
    var userGuild = ss.getSheetByName("Setup").getRange(3, 11).getValue();
    var oppGuild = ss.getSheetByName("Setup").getRange(4, 11).getValue();
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
        fillsheet('Data', teamsCalc(userChTeams, guildDics.userGuild, 'characters'), 1, 1);
        fillsheet('Data', teamsCalc(userShTeams, guildDics.userGuild, 'ships'), 1, 9);
    }
    if (guildDics.oppGuild) {
        fillsheet('Data', teamsCalc(oppChTeams, guildDics.oppGuild, 'characters'), 1, 20);
        fillsheet('Data', teamsCalc(oppShTeams, guildDics.oppGuild, 'ships'), 1, 28);
    }
    // fill GP sheet with guild data
    // [plyrName], [totalGP], [charGP], [shipGP], [zetaCount]
    fillsheet('GP', setupGP(guildDics.userGuild)[1], 2, 1);
    // allCharNames()
    fillsheet('Data', allNames(allCharInfo), 1, 39);
    fillsheet('Data', allNames(allShipInfo), 1, 40);
}

function teamsCalc(teamList, guildInfo, unitType) {
    // count of 50 players if missing add blanks
    var gDataPush = [];
    var info = {};
    // add null ckeck for gdics ??? no wrap func call
    for (var team of teamList) {
        // check if team[0] == '' else push '' into gDataPush
        if (team[0] != '') {
            for (var plyr of guildInfo.players) {
                info['plyrName'] = plyr.data.name;
                info['lz'] = '';
                for (var char in team) {
                    // confirm the unit's name was entered, else set it's info value to ''
                    if (team[char] === '') {
                        info['u' + char] = '';
                    } else {
                        for (var unit of plyr.units) {
                            if (team[char] === unit.data.name) {
                                for (var i = 0; char == 0 && i < unit.data.ability_data.length; ++i) {
                                    if (unit.data.ability_data[i].id.includes('leaderskill') && unit.data.ability_data[i].is_zeta) {
                                        info['lz'] = "✔";
                                        break;
                                    }
                                }
                                if (unitType === 'characters') {
                                    for (var charInfo of allCharInfo) {
                                        if (team[char] === charInfo.name) {
                                            info['u' + char] = (unit.data.power / charInfo.power).toFixed(5);
                                            // info['u' + char] = unit.data.name;
                                        }
                                    }
                                } else {
                                    for (var shipInfo of allShipInfo) {
                                        if (team[char] === shipInfo.name) {
                                            info['u' + char] = (unit.data.power / shipInfo.power).toFixed(5);
                                            // info['u' + char] = unit.data.name;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (unitType === 'characters') {
                    gDataPush.push([
                        info.plyrName,
                        teamAvg(info),
                        info.lz,
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
            // enter blank data for teams that don't have a leader, assumes the rest of members are also absent
            if (unitType === 'characters') {
                for (var i = 0; i < 50; ++i) {
                    gDataPush.push(['', '', '', '', '', '', '', '']);
                }
            } else {
                for (var i = 0; i < 50; ++i) {
                    gDataPush.push(['', '', '', '', '', '', '', '', '', '', '']);
                }
            }
        }
        // if gDataPush % 50 add rows till it is to ensure correct placement of new teams for guilds with < 50 members
        if (gDataPush.length % 50) {
            if (unitType === 'characters') {
                for (var i = gDataPush.length; i % 50; ++i) {
                    gDataPush.push(['', '', '', '', '', '', '', '']);
                }
            } else {
                for (var i = gDataPush.length; i % 50; ++i) {
                    gDataPush.push(['', '', '', '', '', '', '', '', '', '', '']);
                }
            }
        }
    }
    return gDataPush;
}

function updateGuilds() {
    // get the link for the guild from Setup(11,3)
    var userGuild = ss.getSheetByName("Setup").getRange(3, 11).getValue();
    var oppGuild = ss.getSheetByName("Setup").getRange(4, 11).getValue();

    if (getGuildID(userGuild)) {
        saveToJSON(getGuildID(userGuild));
    }

    if (getGuildID(oppGuild)) {
        saveToJSON(getGuildID(oppGuild));
    }
}

// grabs the # for whatever guild is in the list
function getGuildID(gUrl) {
    if (gUrl) {
        if (!/swgoh.gg\/g\/(\d+)/.exec(gUrl)) {
            throw 'Please enter a valid sswgoh.gg guild url in K3 & K4, or leave either blank.';
        } else {
            return /swgoh.gg\/g\/(\d+)/.exec(gUrl)[1];
        }
    }
}

function teamAvg(info) {
    for (var i = 0, cntr = 0, sum = 0; i < 8; ++i) {
        if (info['u' + i] && info['u' + i] != '') {
            sum += parseFloat(info['u' + i]);
            ++cntr;
        }
    }
    return (sum / cntr);
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
        plyrStats.push(["", "", "", "", ""]);
    }

    // add both arrays to our container [0] = Names, [1] = Stats
    plyrContnr.push(plyrNames);
    plyrContnr.push(plyrStats);

    return plyrContnr
}

// returns a list of lists of one string, so the fillsheets function works correctly
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
function fillsheet(tab, values, row, col) {
    sheet = ss.getSheetByName(tab);
    cells = sheet.getRange(row, col, values.length, values[0].length);
    cells.setValues(values);
}







