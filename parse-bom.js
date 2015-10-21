/* Parse Lenovo UX Package BOM file and generate JSON object using Node.js
 * Written by Brian Bothwell (brian.bothwell@avagotech.com)
 *
 * To use, run: `node parse-bom.js <BOM file>` where <BOM file> is an XLSX BOM
 *
 * Requres:
 *  - Node.js
 *  - xlsx
 *
 */

var util    = require('util');
var path    = require('path');
var fs      = require('fs');

var xlsx    = require('xlsx');

function readAppDID(type, cell) {
  var appDIDCell = cell.match(/^([A-Za-z]+)([0-9]+)$/);
  var x = appDIDCell[1];
  var y = parseInt(appDIDCell[2]) + 1;
  var emptyCell = false;
  while (! emptyCell) {
    if (worksheet[x + y]) {
      var appDID = worksheet[x + y].v;
      var valid = false;
      // Verify AppDID matches a valid name from the configuration file
      for (var i = 0; i < config.appDIDNames.length; i++) {
        if (config.appDIDNames[i] === appDID) {
          valid = true;
          break;
        }
      }
      if (valid) {
        appDIDList[type].push(appDID);
      } else {
        util.log("[ERROR] Invalid Applicable Device ID in cell " + cell + ".");
      }
    } else {
      emptyCell = true;
    }
    y++;
  }
}

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
var bomFileXLS = process.argv[2];
try {
  var workbook = xlsx.readFile(bomFileXLS);
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

// Initialization
var releaseName = null;
var releaseType = null;
var osList = [];
var systemList = [];
var adapterList = [];
var appDIDList = {
  ddWinNIC: [],
  ddWinISCSI: [],
  ddWinFC: [],
  ddWinFCoE: [],
  ddLinNIC: [],
  ddLinISCSI: [],
  ddLinFC: [],
  fwSaturn: [],
  fwLancer: [],
  fwBE: [],
  fwSkyhawk: []
};

// Parse worksheet
for (var i in worksheet) {
  if(i[0] === '!') continue;

  // Gather release name
  if (worksheet[i].v.toString().toLowerCase().search(RegExp(config.relNameString)) > -1) {
    releaseName = worksheet[i].v.toString().toUpperCase().split(':')[1].replace(/\s+/g, '');
    if (releaseName.search(/^[A-Z0-9]+$/) < 0) util.log("[ERROR] Invalid release name specified in cell " + i);
  }

  // Gather release type
  if (worksheet[i].v.toString().toLowerCase().search(RegExp(config.relTypeString)) > -1) {
    releaseType = worksheet[i].v.toString().split(':')[1].replace(/\s+/g, '');
    if (['Red', 'Blue'].indexOf(releaseType) < 0) util.log("[ERROR] Invalid release type specified in cell " + i);
  }

  // Gather supported operating systems
  if (worksheet[i].v.toString().toLowerCase() === config.osString) {
    var osCell = i.match(/^([A-Za-z]+)([0-9]+)$/);
    var x = osCell[1];
    var y = parseInt(osCell[2]) + 1;
    var emptyCell = false;
    while (! emptyCell) {
      if (worksheet[x + y]) {
        // Verify OS matches a valid name from the configuration file
        var osName = worksheet[x + y].v.toString();
        var validOS = false;
        for (var os = 0; os < config.osMappings.length; os++) {
          if (osName.search(config.osMappings[os].name) > -1) {
            validOS = true;
            break;
          }
        }
        if (! validOS) {
          util.log("[ERROR] Invalid Operating System Name specified in cell " + x + y + ".");
        } else {
          osList.push(osName);
        }
      } else {
        emptyCell = true;
      }
      y++;
    }
  }

  // Gather supported machine types
  if (worksheet[i].v.toString().toLowerCase() === config.systemString) {
    var systemCell = i.match(/^([A-Za-z]+)([0-9]+)$/);
    var systemNameCol = systemCell[1];
    var systemMTMCol = String.fromCharCode(systemNameCol.charCodeAt(0) + 1);
    var systemItemCol = String.fromCharCode(systemNameCol.charCodeAt(0) + 2);
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
          if (config.mtmHeaders.indexOf(val) > -1) {
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
          // Verify all expected columns are present
          if (! worksheet[systemMTMCol + y]) {
            util.log("[ERROR] Missing MTM value in cell " + systemMTMCol + y + ".");
          } else if (! worksheet[systemItemCol + y] || worksheet[systemItemCol + y].v.toString().search(/[0-9]+/) < 0) {
            util.log("[ERROR] Missing or invalid item ID in cell " + systemItemCol + y + ".");
          } else {
            // Build list of supported machine types
            var mtmList = worksheet[systemMTMCol + y].v.toString().replace(' ', '').split(',');
            systemList[worksheet[systemItemCol + y].v] = {
              name: worksheet[systemNameCol + y].v,
              mtm: mtmList
            };
          }
        }
      }
      y++;
    }
  }

  // Gather supported adapter types
  if (worksheet[i].v.toString().toLowerCase() === config.adapterString) {
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
          // Check header for matching known ASIC types in config file
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
          // Verify all expected columns are present
          if (! worksheet[adapterNameCol + y]) {
            util.log("[ERROR] Missing code name in cell " + adapterNameCol + y + ".");
          } else if (! worksheet[adapterModelCol + y]) {
            util.log("[ERROR] Missing model name in cell " + adapterModelCol + y + ".");
          } else if (! worksheet[adapterV2Col + y]) {
            util.log("[ERROR] Missing DriverFiles entry (V2) in cell " + adapterV2Col + y + ".");
          } else if (! worksheet[adapterAgentCol + y]) {
            util.log("[ERROR] Missing Agentless entry in cell " + adapterAgentCol + y + ".");
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

            // Build list of DriverFiles entries
            var v2List = [];
            v2List = worksheet[adapterV2Col + y].v.toString().match(/\S+/g);

            // Build list of Agentless entries
            var agentList = [];
            var tempList = worksheet[adapterAgentCol + y].v.toString().match(/Entry:[\ ]*([A-F0-9]+)[^]*Type 1:[\ ]*([0-9]+)(?:[^]*Type 2:[\ ]*([0-9]+))?/m);
            if (! tempList) {
              util.log("[ERROR] Missing or invalid Agentless entry in cell " + adapterAgentCol + y + ".");
            } else {
              var entryID = tempList[1];
              var typeOne = tempList[2];
              var typeTwo = tempList[3];
              agentList.push({id: entryID, type: typeOne});
              if (typeTwo) agentList.push({id: entryID, type: typeTwo});
            }

            // Add adapter to list
            adapterList.push({
              name: worksheet[adapterNameCol + y].v,
              model: worksheet[adapterModelCol + y].v,
              v2: v2List,
              agent: agentList,
              asic: asicType,
              mtm: mtmList
            });
          }
        }
      }
      y++;
    }
  }

  // Gather Applicable Device ID Entries
  if (worksheet[i].v.toString().toLowerCase() === config.ddWinNICString) readAppDID('ddWinNIC', i);
  if (worksheet[i].v.toString().toLowerCase() === config.ddWinISCSIString) readAppDID('ddWinISCSI', i);
  if (worksheet[i].v.toString().toLowerCase() === config.ddWinFCString) readAppDID('ddWinFC', i);
  if (worksheet[i].v.toString().toLowerCase() === config.ddWinFCoEString) readAppDID('ddWinFCoE', i);
  if (worksheet[i].v.toString().toLowerCase() === config.ddLinNICString) readAppDID('ddLinNIC', i);
  if (worksheet[i].v.toString().toLowerCase() === config.ddLinISCSIString) readAppDID('ddLinISCSI', i);
  if (worksheet[i].v.toString().toLowerCase() === config.ddLinFCString) readAppDID('ddLinFC', i);
  if (worksheet[i].v.toString().toLowerCase() === config.fwSaturnString) readAppDID('fwSaturn', i);
  if (worksheet[i].v.toString().toLowerCase() === config.fwLancerString) readAppDID('fwLancer', i);
  if (worksheet[i].v.toString().toLowerCase() === config.fwBEString) readAppDID('fwBE', i);
  if (worksheet[i].v.toString().toLowerCase() === config.fwSkyhawkString) readAppDID('fwSkyhawk', i);
}

// Display an error if any expected data was not found.
if (! releaseName) util.log("[ERROR] Release name was not specified.");
if (! releaseType) util.log("[ERROR] Release type was not specified.");
if (osList.length < 1) util.log("[ERROR] No supported operating systems were specified.");
if (systemList.length < 1) util.log("[ERROR] No supported system types were specified.");
if (adapterList.length < 1) util.log("[ERROR] No supported adapters were specified.");
if (appDIDList.ddWinNIC.length < 1) util.log("[ERROR] No Applicable Device ID entries specified for the Windows NIC driver.");
if (appDIDList.ddWinISCSI.length < 1) util.log("[ERROR] No Applicable Device ID entries specified for the Windows iSCSI driver.");
if (appDIDList.ddWinFC.length < 1) util.log("[ERROR] No Applicable Device ID entries specified for the Windows FC driver.");
if (appDIDList.ddWinFCoE.length < 1) util.log("[ERROR] No Applicable Device ID entries specified for the Windows FCoE driver.");
if (appDIDList.ddLinNIC.length < 1) util.log("[ERROR] No Applicable Device ID entries specified for the Linux NIC driver.");
if (appDIDList.ddLinISCSI.length < 1) util.log("[ERROR] No Applicable Device ID entries specified for the Linux iSCSI driver.");
if (appDIDList.ddLinFC.length < 1) util.log("[ERROR] No Applicable Device ID entries specified for the Linux FC/FCoE driver.");
if (appDIDList.fwSaturn.length < 1) util.log("[ERROR] No Applicable Device ID entries specified for Saturn firmware.");
if (appDIDList.fwLancer.length < 1) util.log("[ERROR] No Applicable Device ID entries specified for Lancer firmware.");
if (appDIDList.fwBE.length < 1) util.log("[ERROR] No Applicable Device ID entries specified for BE firmware.");
if (appDIDList.fwSkyhawk.length < 1) util.log("[ERROR] No Applicable Device ID entries specified for Skyhawk firmware.");

// Add all data to a single object and write it to disk
var bomDump = {
  release: releaseName,
  type: releaseType,
  osList: osList,
  systemList: systemList.filter(Boolean),
  adapterList: adapterList,
  appDIDList: appDIDList
};
var bomFileJSON = bomFileXLS.replace(/\.xls(?:x)?$/, '.json');
fs.writeFile(bomFileJSON, JSON.stringify(bomDump, null, 2), function(err) {
  if (err) {
    return util.log("[ERROR] Unable to write JSON file to disk.");
  }
});

// ***DEBUG***
// console.log('Release: ' + releaseName);
// console.log('Type: ' + releaseType);
// console.dir(osList);
// console.dir(systemList);
// console.dir(adapterList);
// console.dir(appDIDList);
// console.log(JSON.stringify(bomDump, null, 2));
// console.log(bomFileJSON);
