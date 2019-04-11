function gZetas() {
    // looks at the ss and finds the correct url for the guild listed
    var site = "https://swgoh.gg/g/3015/dark-lords/zetas/";
   // fetch guild zeta page from swgoh.gg
   var html = UrlFetchApp.fetch(site).getContentText();
   // Final array of [plyr, char, [zetas]]
   var fullvalues = [];
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
       var char = character[1];
       var plchldr = [];
       var zTitles;
       while ( (zTitles = zetaTitle.exec(character[2]) ) !== null) {
         plchldr.push(zTitles[2]);
       }
       // each character through needs to have a plyr name, char name, and zeta list array
       // [x] Set, [x][0] plyr, [x][1] char, [x][2] zeta array
       fullvalues.push([plyr, char, plchldr]);
     }
   }