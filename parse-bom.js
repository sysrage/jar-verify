/* Parse Lenovo UX Package BOM file and generate JSON object using Node.js
 * Written by Brian Bothwell (brian.bothwell@avagotech.com)
 * 
 * To use, run: `node parse-bom.js <BOM file>` where <BOM file> is an XLSX BOM
 * 
 * Requres:
 *  - Node.js
 *  - xlsx
 *  - bluebird (only required when built-in Promise support unavailable)
 *
 */

var util    = require('util');
var path    = require('path');
var fs      = require('fs');

var xlsx    = require('xlsx');

if (typeof Promise === 'undefined') Promise = require('bluebird');

// Read configuration file
try {
  var config = require('./config.js');
} catch (err) {
  util.log("[ERROR] Unable to open configuration file.");
  console.log(err);
  return 1;
}

// Verify XLSX BOM file has been passed as an argument
if (! process.argv[2]) {
  console.log("Usage: node parse-bom.js <BOM File>" + 
    "\nWhere <BOM File> is the name of an XLSX BOFM file.\n");
  return 1;
}

// Read in the specified XLSX BOM file
try {
  var workbook = xlsx.readFile(process.argv[2]);
  var worksheet = workbook.Sheets[workbook.SheetNames[0]];
} catch (err) {
  if (err.code === 'ENOENT') {
    util.log("[ERROR] Specified BOM file does not exists.\n");
  } else if (err.code === 'EACCES') {
    util.log("[ERROR] Permission denied trying to open specified BOM file.\n");
  } else {
    util.log("[ERROR] Unexpected error: " + err);
  }
  return 1;
}

// Obtain release name and type name
var releaseName = worksheet['A1'].v.split(' ')[worksheet['A1'].v.split(' ').length - 1];
var typeName = worksheet['A2'].v.split(' ')[worksheet['A2'].v.split(' ').length - 1];

// Initialization
var osList = [];
var systemList = [];
var adapterList = [];

// Parse remaining worksheet
for (i in worksheet) {
  if(i[0] === '!') continue;

  // Gather list of supported operating systems
  if (worksheet[i].v.toString().toLowerCase() === 'operating systems') {
    var osCell = i.match(/^([A-Za-z]+)([0-9]+)$/);
    var x = osCell[1];
    var y = parseInt(osCell[2]) + 1;
    var emptyCell = false;
    while (! emptyCell) {
      if (worksheet[x + y]) {
        osList.push(worksheet[x + y].v);
      } else {
        emptyCell = true;
      }
      y++;        
    }
  }

  // Gather supported machine types
  if (worksheet[i].v.toString().toLowerCase() === 'rack' || worksheet[i].v.toString().toLowerCase() == 'flex') {
    var systemCell = i.match(/^([A-Za-z]+)([0-9]+)$/);
    var systemNameCol = systemCell[1];
    var systemMTMCol = String.fromCharCode(systemCell[1].charCodeAt(0) + 1);
    var systemItemCol = String.fromCharCode(systemCell[1].charCodeAt(0) + 2);
    var y = parseInt(systemCell[2]) + 1;
    var emptyCell = false;
    while (! emptyCell) {
      if (worksheet[systemNameCol + y]) {
        var mtmList = worksheet[systemMTMCol + y].v.toString().split(',');
        systemList.push({
          id: worksheet[systemItemCol + y].v,
          name: worksheet[systemNameCol + y].v,
          mtm: mtmList
        });
      } else {
        emptyCell = true;
      }
      y++;
    }
  }

  // Gather supported adapter types
  if (worksheet[i].v.toString().toLowerCase() === 'adapter models') {
    var adapterCell = i.match(/^([A-Za-z]+)([0-9]+)$/);
    var adapterMTMCol = adapterCell[1];
    var adapterNameCol = String.fromCharCode(adapterCell[1].charCodeAt(0) + 1);
    var adapterModelCol = String.fromCharCode(adapterCell[1].charCodeAt(0) + 2);
    var adapterV2Col = String.fromCharCode(adapterCell[1].charCodeAt(0) + 3);
    var adapterAgentCol = String.fromCharCode(adapterCell[1].charCodeAt(0) + 4);
    var y = parseInt(adapterCell[2]) + 2;
    var emptyCount = 0;

    // End adapter search after two blank rows
    while (emptyCount < 3) {
      console.log(adapterNameCol + y);
      if (worksheet[adapterNameCol + y]) {
        // Check for header matching known ASIC types
        config.asicTypes.forEach(function (asic) {
          if (worksheet[adapterMTMCol + y].v.toString().toLowerCase().search(asic.name.toLowerCase()) > -1) {
            var asicType = asic.name;
            var cell = adapterMTMCol + y;
            var asicCell = cell.match(/^([A-Za-z]+)([0-9]+)$/);
            console.log('asicType: ' + asicType + ' -- cell: ' + cell);
          }
        });
        y++;
      } else {
        emptyCount++;
        y++;
      }
    }
  }
  // config.asicTypes.forEach(function (asic) {
  //   if (worksheet[i].v.toString().toLowerCase().search(asic.name.toLowerCase()) > -1 ) {
  //     var asicCell = i.match(/^([A-Za-z]+)([0-9]+)$/);
  //     console.log('asic: ' + asic.name + ' -- cell: ' + i);
  //   }
  // });

}

// console.log('Release: ' + releaseName);
// console.log('Type: ' + typeName);
// console.dir(osList);
// console.dir(systemList);
// console.dir(adapterList);
