const CollectContent = require('./operations/CollectContent'),
    Inquiry = require('./operations/Inquiry'),
    OpenLinks = require('./operations/OpenLinks'),
    DownloadContent = require('./operations/DownloadContent'),
    Root = require('./operations/Root'),
    Scraper = require('./Scraper.js');

module.exports = {
    Scraper,
    Root,
    DownloadContent,
    Inquiry,
    OpenLinks,
    CollectContent
}


// function priceCheck() {
//     var form = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Structural Steel Form");
//     var formValues = form.getRange("C3:C6").getValues();
//     var reference = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Steel Reference 2.0");
//     var referenceValues = reference.getRange("B3:G1200").getValues();
      
//     for (i = 0; i < referenceValues.length; i++) {
//       if (referenceValues[i][0] == formValues[0] && referenceValues[i][1] == formValues[1] && referenceValues[i][2] == formValues[2] && referenceValues[i][3] == formValues[3] && referenceValues[i][5].toString() == ""){
//         Browser.msgBox(reference[i][5])
//         Browser.msgBox("No cost was found associated with this structural steel item. Please enter the cost of the item into the ''Steel Reference 2.0'' spreadsheet");
//         return;
//       } else {
//         structuralSteelFormSubmit3()
//       }
//     }
//   }



