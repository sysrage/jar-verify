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
for (var i in worksheet) {
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
  if (worksheet[i].v.toString().toLowerCase() === 'machine types') {
    var systemCell = i.match(/^([A-Za-z]+)([0-9]+)$/);
    var systemNameCol = systemCell[1];
    var systemMTMCol = String.fromCharCode(systemCell[1].charCodeAt(0) + 1);
    var systemItemCol = String.fromCharCode(systemCell[1].charCodeAt(0) + 2);
    var y = parseInt(systemCell[2]) + 2;

    var wasBlank = true;
    var moreRows = true;

    while (moreRows) {
      if (wasBlank) {
        // If last row was blank, this row must be a system type header or we're done
        if (! worksheet[systemNameCol + y]) {
          moreRows = false;
          continue;
        } else {
          var val = worksheet[systemNameCol + y].v.toString().toLowerCase();
          if (val === 'rack' || val === 'flex') {
            wasBlank = false;
          } else {
            util.log("[ERROR] Invalid system type header in Machine Types section.");
            moreRows = false;
          }
        }
      } else {
        if (! worksheet[systemNameCol + y]) {
          wasBlank = true;
        } else {
          // Build list of supported machine types
          var mtmList = worksheet[systemMTMCol + y].v.toString().replace(' ', '').split(',');
          systemList[worksheet[systemItemCol + y].v] = {
            name: worksheet[systemNameCol + y].v,
            mtm: mtmList
          };
        }
      }
      y++;
    }
  }

  // Gather supported adapter types
  if (worksheet[i].v.toString().toLowerCase() === 'adapter models') {
    var adapterCell = i.match(/^([A-Za-z]+)([0-9]+)$/);
    var adapterMTMCol = adapterCell[1];
    var adapterNameCol = String.fromCharCode(adapterMTMCol.charCodeAt(0) + 1);
    var adapterModelCol = String.fromCharCode(adapterMTMCol.charCodeAt(0) + 2);
    var adapterV2Col = String.fromCharCode(adapterMTMCol.charCodeAt(0) + 3);
    var adapterAgentCol = String.fromCharCode(adapterMTMCol.charCodeAt(0) + 4);

    var colNum = adapterMTMCol.charCodeAt(0) - 65;
    var y = parseInt(adapterCell[2]) + 2;

    // Duplicate data in all merged cells
    worksheet['!merges'].forEach(function(merge) {
      if (merge.s.c === colNum && merge.e.c === colNum) {
        var val = worksheet[adapterMTMCol + (merge.s.r + 1)].v;
        for (var r = (merge.s.r + 2); r <= (merge.e.r + 1); r++) {
          worksheet[adapterMTMCol + r] = {v: val};
        }
      }
    });

    var wasBlank = true;
    var moreRows = true;
    var asicType = null;

    while (moreRows) {
      if (wasBlank) {
        // If last row was blank, this row must be an ASIC type header or we're done
        if (! worksheet[adapterMTMCol + y]) {
          moreRows = false;
          continue;
        } else {
          var validASIC = false;
          // Check for header matching known ASIC types in config file
          config.asicTypes.forEach(function (asic) {
            if (worksheet[adapterMTMCol + y].v.toString().toLowerCase().search(asic.name.toLowerCase()) > -1) {
              asicType = asic.name;
              validASIC = true;
            }
          });
          if (validASIC) {
            wasBlank = false;
          } else {
            util.log("[ERROR] Invalid ASIC header in Adapter Models section.");
            moreRows = false;
          }
        }
      } else {
        if (! worksheet[adapterMTMCol + y]) {
          wasBlank = true;
        } else {
          // Build list of supported machine types
          var mtmList = [];
          var tempList = worksheet[adapterMTMCol + y].v.toString().replace(' ', '').split(',');
          tempList.forEach(function(entry) {
            if (entry.search('-') > -1) {
              var firstID = parseInt(entry.split('-')[0]);
              var lastID = parseInt(entry.split('-')[1]);
              for (var m = firstID; m <= lastID; m++) {
                if (systemList[m]) {
                  systemList[m].mtm.forEach(function (mtm) {
                    mtmList.push(mtm);
                  });
                } else {
                  util.log("[ERROR] Invalid MTM ID in cell " + adapterMTMCol + y + " (" + m + ").");
                }
              }
            } else {
              if (systemList[entry]) {
                systemList[entry].mtm.forEach(function (mtm) {
                  mtmList.push(mtm);
                });
              } else {
                util.log("[ERROR] Invalid MTM ID in cell " + adapterMTMCol + y + " (" + entry + ").");
              }
            }
          });

          // Add adapter to list
          adapterList.push({
            name: worksheet[adapterNameCol + y].v,
            model: worksheet[adapterModelCol + y].v,
            v2: worksheet[adapterV2Col + y].v,
            agent: worksheet[adapterAgentCol + y].v,
            asic: asicType,
            mtm: mtmList
          });
        }
      }
      y++;
    }
  }


}

// console.log('Release: ' + releaseName);
// console.log('Type: ' + typeName);
// console.dir(osList);
// console.dir(systemList);
// console.dir(adapterList);