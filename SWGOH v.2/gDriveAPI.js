function saveGJSON() {
    // get the link for the guild from Setup(11,3)
    var guildLink = ss.getSheetByName("Setup").getRange(3,11).getValue();

    // get the guild data from swgoh.gg/api
    var guildInfo = JSON.parse(UrlFetchApp.fetch("https://swgoh.gg/api/guild/"+getGuildID(guildLink)+"/"));
    
    var original = DriveApp.createFile(getGuildID(guildLink)+".json", JSON.stringify(guildInfo));
    
    // set the destination folder
    DriveApp.getFoldersByName("swgoh").next()
    
    moveFiles(original.getId(), DriveApp.getFoldersByName("twPlanner").next());
}

function moveFiles(sourceFileId, targetFolderId) {
    var mover = DriveApp.getFileById(sourceFileId);
    DriveApp.getFolderById(targetFolderId).addFile(mover);
    // remove the file using the parent folder's method
    mover.getParents().next().removeFile(mover);
}