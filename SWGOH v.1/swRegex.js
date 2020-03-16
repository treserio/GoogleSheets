function dumber() {

  var site = "https://swgoh.gg/g/3015/dark-lords/zetas/";
  // fetch zeta page from swgoh.gg
  var html = UrlFetchApp.fetch(site).getContentText();
  // regex to grab rows from the guild zeta table, each row is a new player
  // [1]=row data, [2]=plyrname
  var rowRegex = /(<td data-sort-value="(.*?)"[\s\S]*?<\/tr>)/g
  // Array to hold player rows, the entire string, from the above rowRegex
  var plyrArray = [];
  // Array to hold player names found in the capture group of rowRegex
  var plyrName = [];

  
  
  var plchldr = [];
  
 
  while ( (currentRow=rowRegex.exec(html) ) !== null ) {
    // [1]=row data, [2]=plyrname
    plyrArray.push(currentRow[1]);
    plyrName.push(currentRow[2]);
  }

  var i = 0;
   for (row in plyrArray) {
     var zetalist;
     // Following regex values must be reinitialized to reset their counter for each instance of the loop.
     // Regex to grab the listed zeta abilities of a character from plyrArray values
     var zetaRegex = new RegExp ('-abilities">[\\s\\S]+?<\\/div>\\s<\\/div>','g');
     // Regex to grab character name in capture group from plyrArray values
     var charRegex = new RegExp ('alt="(.*?)"','g');
     // Regex to grab zeta names from zetaRegex[0]
     var zetaTitle = new RegExp ('(title="(.*?)">)','g');
     while ( (zetalist = zetaRegex.exec(plyrArray[row]) ) !== null) {
       var char = charRegex.exec(plyrArray[row]);
       var zTitles;
       Logger.log(row);
       while ( (zTitles = zetaTitle.exec(zetalist[0]) ) !== null) {
         Logger.log(i);
         Logger.log(plyrName[row] +" / "+ char[1] +" / "+ zTitles[2]);
         plchldr.push([plyrName[row], char[1], zTitles[2]]);
         i++;
       }
     }
   }
}