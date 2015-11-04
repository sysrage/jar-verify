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

/**************************************************************/
/* Function/Class Definitions                                 */
/**************************************************************/

// Function to parse Applicable Device ID entries
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
        if (config.appDIDNames[i].name === appDID) {
          valid = true;
          break;
        }
      }
      if (valid) {
        bomAppDIDList[type].push(appDID);
      } else {
        util.log("[ERROR] Invalid Applicable Device ID in cell " + cell + ".");
      }
    } else {
      emptyCell = true;
    }
    y++;
  }
}

// Function to validate the supplied operating system
function validateOS(osName, cell) {
  var validOS = false;
  for (var os = 0; os < config.osMappings.length; os++) {
    if (osName.search(new RegExp('^' + config.osMappings[os].name)) > -1) {
      validOS = true;
      var osMapName = config.osMappings[os].name;
      var osMapID = config.osMappings[os].id;
      var osMapSDKName = config.osMappings[os].pkgsdkName;
      var osMapVersion = config.osMappings[os].version;
      var osMapArch = config.osMappings[os].arch;
      var osMapType = config.osMappings[os].type;
      var osMapDDName = config.osMappings[os].ddName;
      break;
    }
  }

  if (! validOS) {
    util.log("[ERROR] Invalid Operating System Name specified in cell " + cell + ".");
  } else {
    // Determine architecture of OS
    if (osName.toLowerCase().search(/32(?:[\-\ ])?bit/) > -1 || osName.toLowerCase().search(/x86/) > -1) {
      if (osMapArch.indexOf('x86') < 0) {
        util.log("[ERROR] Invalid architecture specified for OS in cell " + cell + ".");
      } else {
        var osArch = 'x86';
      }
    } else if (osName.toLowerCase().search(/64(?:[\-\ ])?bit/) > -1 || osName.toLowerCase().search(/x64/) > -1) {
      if (osMapArch.indexOf('x64') < 0) {
        util.log("[ERROR] Invalid architecture specified for OS in cell " + cell + ".");
      } else {
        var osArch = 'x64';
      }
    } else if (osMapArch.length === 1) {
      var osArch = osMapArch[0];
    }

    if (! osArch) {
      util.log("[ERROR] Unable to determine architecture for OS in cell " + cell + ".");
    } else {
      // Determine subversion (update/service pack/etc.) of OS
      var re = new RegExp('^' + osMapName + '[\.\ ](?:[Uu]|SP)?([0-9]+)');
      if (osName.match(re)) {
        var osSubVersion = osName.match(re)[1];
      } else {
        if (osMapType === 'windows') {
          var osSubVersion = '0';
        }
      }

      if (! osSubVersion) {
        util.log("[ERROR] Unable to determine point release for OS in cell " + cell + ".");
      } else {
        // Determine any extras (KVM, Xen, etc.)
        var extras = osName.toLowerCase().match(/((?:kvm)|(?:xen))/);
        if (extras) var osExtras = extras[1];

        osItem = {
          fullName: osName,
          id: osMapID,
          name: osMapName,
          pkgsdkName: osMapSDKName,
          version: osMapVersion,
          subVersion: osSubVersion,
          extras: osExtras,
          arch: osArch,
          type: osMapType,
          ddName: osMapDDName
        }
        return osItem;
      }
    }
  }
}

/**************************************************************/
/* Start Program                                              */
/**************************************************************/

// Read configuration file
try {
  var config = require('./config.js');
} catch (err) {
  util.log("[ERROR] Unable to open configuration file.");
  console.log(err);
  return 1;
}

if (config.dataDir[config.dataDir.length - 1] !== '/') config.dataDir += '/';

// Create data directory if it doesn't exist
if (! fs.existsSync(config.dataDir)){
  try {
    fs.mkdirSync(config.dataDir);
  } catch (err) {
    util.log("[ERROR] Unable to create data directory.\n" + err + "\n");
    return 1;
  }
  util.log("[INFO] Data directory did not exist. Empty directory created.");
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

// BOM Applicable Device ID entries -- This will be removed
var bomAppDIDList = {
  ddWinNIC: [],
  ddWinISCSI: [],
  ddWinFC: [],
  ddWinFCoE: [],
  ddLinNIC: [],
  ddLinISCSI: [],
  ddLinFC: [],
  fwSaturn: [],
  fwLancer: [],
  fwBE3: [],
  fwSkyhawk: []
};

// Parse worksheet
for (var i in worksheet) {
  if(i[0] === '!') continue;

  // Gather release name
  if (worksheet[i].v.toString().toLowerCase().search(RegExp(config.headerStr.relName)) > -1) {
    releaseName = worksheet[i].v.toString().toUpperCase().split(':')[1].replace(/\s+/g, '');
    if (releaseName.search(/^[A-Z0-9]+$/) < 0) util.log("[ERROR] Invalid release name specified in cell " + i);
  }

  // Gather release type
  if (worksheet[i].v.toString().toLowerCase().search(RegExp(config.headerStr.relType)) > -1) {
    releaseType = worksheet[i].v.toString().split(':')[1].replace(/\s+/g, '');
    if (['Red', 'Blue'].indexOf(releaseType) < 0) util.log("[ERROR] Invalid release type specified in cell " + i);
  }

  // Gather supported operating systems
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.osList) {
    var osCell = i.match(/^([A-Za-z]+)([0-9]+)$/);
    var x = osCell[1];
    var y = parseInt(osCell[2]) + 1;
    var emptyCell = false;
    while (! emptyCell) {
      if (worksheet[x + y]) {
        // Verify OS matches a valid name from the configuration file
        var osName = worksheet[x + y].v.toString().trim().replace('\r\n', ' ');
        var validOS = validateOS(osName, x + y);
        if (validOS) osList.push(validOS);
      } else {
        emptyCell = true;
      }
      y++;
    }
  }

  // Gather supported machine types
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.systemList) {
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
          if (config.headerStr.systemType.indexOf(val) > -1) {
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
              name: worksheet[systemNameCol + y].v.trim(),
              mtm: mtmList
            };
          }
        }
      }
      y++;
    }
  }

  // Gather supported adapter types
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.adapterList) {
    var adapterCell = i.match(/^([A-Za-z]+)([0-9]+)$/);
    var adapterMTMCol = adapterCell[1];
    var adapterNameCol = String.fromCharCode(adapterMTMCol.charCodeAt(0) + 1);
    var adapterModelCol = String.fromCharCode(adapterMTMCol.charCodeAt(0) + 2);
    var adapterV2Col = String.fromCharCode(adapterMTMCol.charCodeAt(0) + 3);
    var adapterAgentCol = String.fromCharCode(adapterMTMCol.charCodeAt(0) + 4);
    var adapterPLDMCol = String.fromCharCode(adapterMTMCol.charCodeAt(0) + 5);

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
          } else if (! worksheet[adapterPLDMCol + y]) {
            util.log("[ERROR] Missing PLDM FW DL Data in cell " + adapterAgentCol + y + ".");
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
            v2List = worksheet[adapterV2Col + y].v.toString().toUpperCase().match(/\S+/g);

            // Build list of Agentless entries
            var agentList = [];
            var tempList = worksheet[adapterAgentCol + y].v.toString().toUpperCase().match(/ENTRY:[\ ]*([A-F0-9]+)[^]*TYPE 1:[\ ]*([0-9]+)(?:[^]*TYPE 2:[\ ]*([0-9]+))?/m);
            if (! tempList) {
              util.log("[ERROR] Missing or invalid Agentless entry in cell " + adapterAgentCol + y + ".");
            } else {
              var entryID = tempList[1];
              var typeOne = tempList[2];
              var typeTwo = tempList[3];
              agentList.push({id: entryID, type: typeOne});
              if (typeTwo) agentList.push({id: entryID, type: typeTwo});
            }

            // Gather PLDM FW DL data
            var tempData = worksheet[adapterPLDMCol + y].v.toString().toUpperCase().match(/VENDOR ID:[\ ]*([A-F0-9]{4})[^]*DEVICE ID:[\ ]*([A-F0-9]{4})/m);
            if (! tempData) {
              var pldmData = {};
            } else {
              var pldmData = { vendor: tempData[1], device: tempData[2] };
            }

            // Add adapter to list
            adapterList.push({
              name: worksheet[adapterNameCol + y].v.toString().replace('\r\n', ' ').trim(),
              model: worksheet[adapterModelCol + y].v.toString().trim(),
              v2: v2List,
              agent: agentList,
              pldm: pldmData,
              asic: asicType,
              mtm: mtmList
            });
          }
        }
      }
      y++;
    }
  }

  // Gather Applicable Device ID entries from BOM -- This will be removed
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.ddWinNIC) readAppDID('ddWinNIC', i);
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.ddWinISCSI) readAppDID('ddWinISCSI', i);
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.ddWinFC) readAppDID('ddWinFC', i);
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.ddWinFCoE) readAppDID('ddWinFCoE', i);
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.ddLinNIC) readAppDID('ddLinNIC', i);
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.ddLinISCSI) readAppDID('ddLinISCSI', i);
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.ddLinFC) readAppDID('ddLinFC', i);
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.fwSaturn) readAppDID('fwSaturn', i);
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.fwLancer) readAppDID('fwLancer', i);
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.fwBE3) readAppDID('fwBE3', i);
  if (worksheet[i].v.toString().toLowerCase() === config.headerStr.fwSkyhawk) readAppDID('fwSkyhawk', i);
}

// Generate list of Applicable Device ID entries
var appDIDList = { fw: {}, dd: {} };
adapterList.forEach(function(adapter) {
  var agentID = adapter.agent[0].id.match(/([0-9A-Z]{4})([0-9A-Z]{4})/);
  var ssDID = '' + agentID[2] + agentID[1];
  osList.forEach(function(os) {
    // Build firmware entries
    if (! appDIDList['fw'][os.type]) appDIDList['fw'][os.type] = {};
    if (! appDIDList['fw'][os.type][adapter.asic]) appDIDList['fw'][os.type][adapter.asic] = [];
    config.appDIDNames.forEach(function(appDID) {
      if (appDID.value.search(new RegExp('SUBSYS_' + ssDID + '$')) > -1) {
        if (appDIDList['fw'][os.type][adapter.asic].indexOf(appDID.name) < 0) appDIDList['fw'][os.type][adapter.asic].push(appDID.name);
      }
    });

    // Build driver entries
    if (os.ddName !== 'none') {
      if (! appDIDList['dd'][os.ddName]) appDIDList['dd'][os.ddName] = {};
      config.asicTypes.forEach(function(cASIC) {
        if (adapter.asic === cASIC.name) {
          config.appDIDNames.forEach(function(appDID) {
            if (appDID.value.search(new RegExp('SUBSYS_' + ssDID + '$')) > -1) {
              if (cASIC.type === 'fc') {
                if (! appDIDList['dd'][os.ddName]['fc']) appDIDList['dd'][os.ddName]['fc'] = [];
                if (appDIDList['dd'][os.ddName]['fc'].indexOf(appDID.name) < 0) appDIDList['dd'][os.ddName]['fc'].push(appDID.name);
              }
              if (cASIC.type === 'cna' || cASIC.type === 'nic') {
                if (! appDIDList['dd'][os.ddName]['nic']) appDIDList['dd'][os.ddName]['nic'] = [];
                if (appDIDList['dd'][os.ddName]['nic'].indexOf(appDID.name) < 0) appDIDList['dd'][os.ddName]['nic'].push(appDID.name);
              }
              if (cASIC.type === 'cna' || cASIC.type === 'iscsi') {
                if (appDID.type === 'iscsi') {
                  if (! appDIDList['dd'][os.ddName]['iscsi']) appDIDList['dd'][os.ddName]['iscsi'] = [];
                  if (appDIDList['dd'][os.ddName]['iscsi'].indexOf(appDID.name) < 0) appDIDList['dd'][os.ddName]['iscsi'].push(appDID.name);
                }
              }
              if (cASIC.type === 'cna' || cASIC.type === 'fcoe') {
                if (appDID.type === 'fcoe') {
                  if (os.type === 'windows') {
                    if (! appDIDList['dd'][os.ddName]['cna']) appDIDList['dd'][os.ddName]['cna'] = [];
                    if (appDIDList['dd'][os.ddName]['cna'].indexOf(appDID.name) < 0) appDIDList['dd'][os.ddName]['cna'].push(appDID.name);
                  } else {
                    if (! appDIDList['dd'][os.ddName]['fc']) appDIDList['dd'][os.ddName]['fc'] = [];
                    if (appDIDList['dd'][os.ddName]['fc'].indexOf(appDID.name) < 0) appDIDList['dd'][os.ddName]['fc'].push(appDID.name);
                  }
                }
              }
            }
          });
        }
      });
    }
  });
});

// Compare BOM Applicable Device ID entries with auto-generated entries -- This will be removed
bomAppDIDList.ddWinNIC.forEach(function(DID) {
  if (appDIDList['dd']['windows']['nic'].indexOf(DID) < 0) util.log("[WARNING] BOM file contains Windows NIC driver AppDID which isn't expected (" + DID + ").");
});
appDIDList['dd']['windows']['nic'].forEach(function(DID) {
  if (bomAppDIDList.ddWinNIC.indexOf(DID) < 0) util.log("[WARNING] Expected Windows NIC driver AppDID not found in BOM file (" + DID + ").");
});
bomAppDIDList.ddWinISCSI.forEach(function(DID) {
  if (appDIDList['dd']['windows']['iscsi'].indexOf(DID) < 0) util.log("[WARNING] BOM file contains Windows ISCSI driver AppDID which isn't expected (" + DID + ").");
});
appDIDList['dd']['windows']['iscsi'].forEach(function(DID) {
  if (bomAppDIDList.ddWinISCSI.indexOf(DID) < 0) util.log("[WARNING] Expected Windows ISCSI driver AppDID not found in BOM file (" + DID + ").");
});
bomAppDIDList.ddWinFC.forEach(function(DID) {
  if (appDIDList['dd']['windows']['fc'].indexOf(DID) < 0) util.log("[WARNING] BOM file contains Windows FC driver AppDID which isn't expected (" + DID + ").");
});
appDIDList['dd']['windows']['fc'].forEach(function(DID) {
  if (bomAppDIDList.ddWinFC.indexOf(DID) < 0) util.log("[WARNING] Expected Windows FC driver AppDID not found in BOM file (" + DID + ").");
});
bomAppDIDList.ddWinFCoE.forEach(function(DID) {
  if (appDIDList['dd']['windows']['cna'].indexOf(DID) < 0) util.log("[WARNING] BOM file contains Windows FCoE driver AppDID which isn't expected (" + DID + ").");
});
appDIDList['dd']['windows']['cna'].forEach(function(DID) {
  if (bomAppDIDList.ddWinFCoE.indexOf(DID) < 0) util.log("[WARNING] Expected Windows FCoE driver AppDID not found in BOM file (" + DID + ").");
});
bomAppDIDList.ddLinNIC.forEach(function(DID) {
  if (appDIDList['dd']['rhel6']['nic'].indexOf(DID) < 0) util.log("[WARNING] BOM file contains Linux NIC driver AppDID which isn't expected (" + DID + ").");
});
appDIDList['dd']['rhel6']['nic'].forEach(function(DID) {
  if (bomAppDIDList.ddLinNIC.indexOf(DID) < 0) util.log("[WARNING] Expected Linux NIC driver AppDID not found in BOM file (" + DID + ").");
});
bomAppDIDList.ddLinISCSI.forEach(function(DID) {
  if (appDIDList['dd']['rhel6']['iscsi'].indexOf(DID) < 0) util.log("[WARNING] BOM file contains Linux ISCSI driver AppDID which isn't expected (" + DID + ").");
});
appDIDList['dd']['rhel6']['iscsi'].forEach(function(DID) {
  if (bomAppDIDList.ddLinISCSI.indexOf(DID) < 0) util.log("[WARNING] Expected Linux ISCSI driver AppDID not found in BOM file (" + DID + ").");
});
bomAppDIDList.ddLinFC.forEach(function(DID) {
  if (appDIDList['dd']['rhel6']['fc'].indexOf(DID) < 0) util.log("[WARNING] BOM file contains Linux FC driver AppDID which isn't expected (" + DID + ").");
});
appDIDList['dd']['rhel6']['fc'].forEach(function(DID) {
  if (bomAppDIDList.ddLinFC.indexOf(DID) < 0) util.log("[WARNING] Expected Linux FC driver AppDID not found in BOM file (" + DID + ").");
});
bomAppDIDList.fwSaturn.forEach(function(DID) {
  if (appDIDList['fw']['linux']['Saturn'].indexOf(DID) < 0) util.log("[WARNING] BOM file contains Saturn firmware AppDID which isn't expected (" + DID + ").");
});
appDIDList['fw']['linux']['Saturn'].forEach(function(DID) {
  if (bomAppDIDList.fwSaturn.indexOf(DID) < 0) util.log("[WARNING] Expected Saturn firmware AppDID not found in BOM file (" + DID + ").");
});
bomAppDIDList.fwLancer.forEach(function(DID) {
  if (appDIDList['fw']['linux']['Lancer'].indexOf(DID) < 0) util.log("[WARNING] BOM file contains Lancer firmware AppDID which isn't expected (" + DID + ").");
});
appDIDList['fw']['linux']['Lancer'].forEach(function(DID) {
  if (bomAppDIDList.fwLancer.indexOf(DID) < 0) util.log("[WARNING] Expected Lancer firmware AppDID not found in BOM file (" + DID + ").");
});
bomAppDIDList.fwBE3.forEach(function(DID) {
  if (appDIDList['fw']['linux']['BE3'].indexOf(DID) < 0) util.log("[WARNING] BOM file contains BE3 firmware AppDID which isn't expected (" + DID + ").");
});
appDIDList['fw']['linux']['BE3'].forEach(function(DID) {
  if (bomAppDIDList.fwBE3.indexOf(DID) < 0) util.log("[WARNING] Expected BE3 firmware AppDID not found in BOM file (" + DID + ").");
});
bomAppDIDList.fwSkyhawk.forEach(function(DID) {
  if (appDIDList['fw']['linux']['Skyhawk'].indexOf(DID) < 0) util.log("[WARNING] BOM file contains Skyhawk firmware AppDID which isn't expected (" + DID + ").");
});
appDIDList['fw']['linux']['Skyhawk'].forEach(function(DID) {
  if (bomAppDIDList.fwSkyhawk.indexOf(DID) < 0) util.log("[WARNING] Expected Skyhawk firmware AppDID not found in BOM file (" + DID + ").");
});

// Display an error if any expected data was not found.
if (! releaseName) util.log("[ERROR] Release name was not specified.");
if (! releaseType) util.log("[ERROR] Release type was not specified.");
if (osList.length < 1) util.log("[ERROR] No supported operating systems were specified.");
if (systemList.length < 1) util.log("[ERROR] No supported system types were specified.");
if (adapterList.length < 1) util.log("[ERROR] No supported adapters were specified.");
osList.forEach(function(os) {
  if (Object.keys(appDIDList['fw'][os.type]).length < 1) {
    util.log("[ERROR] No Applicable Device ID entries for any " + os.type + " firmware packages.");
  } else {
    for (asic in appDIDList['fw'][os.type]) {
      if (appDIDList['fw'][os.type][asic].length < 1) util.log("[ERROR] No Applicable Device ID entries for the " + os.type + " " + asic + " firmware package.");
    }
  }
  if (os.ddName !== 'none') {
    if (Object.keys(appDIDList['dd'][os.ddName]).length < 1) {
      util.log("[ERROR] No Applicable Device ID entries for any " + os.ddName + " driver packages.");
    } else {
      for (proto in appDIDList['dd'][os.ddName]) {
        if (appDIDList['dd'][os.ddName][proto].length < 1) util.log("[ERROR] No Applicable Device ID entries for the " + os.ddName + " " + proto + " driver package.");
      }
    }
  }
});

// Add all data to a single object and write it to disk
var bomDump = {
  release: releaseName,
  type: releaseType,
  osList: osList,
  systemList: systemList.filter(Boolean),
  adapterList: adapterList,
  appDIDList: appDIDList
};
var bomFileJSON = releaseName + '-bom.json';

// Back up old BOM for this release then save new BOM
try {
  var oldBOM = fs.readFileSync(config.dataDir + bomFileJSON);
  var curDate = new Date();
  var buName = bomFileJSON + '-' + curDate.getFullYear() + (curDate.getUTCMonth() + 1) + curDate.getDate() + curDate.getHours() + curDate.getMinutes() + curDate.getSeconds();
  fs.writeFileSync(config.dataDir + buName, oldBOM);
  util.log("[INFO] An existing BOM file for this release has been backed up.");
} catch (err) {
  if (err.code !== 'ENOENT') return util.log("[ERROR] Problem backing up old BOM data. New data will not be saved.\n" + err);
}

fs.writeFile(config.dataDir + bomFileJSON, JSON.stringify(bomDump, null, 2), function(err) {
  if (err) return util.log("[ERROR] Unable to write BOM data to disk.\n" + err);
  util.log("[INFO] All BOM file data has been written to '" + config.dataDir + bomFileJSON + "'.");
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
// console.dir(bomDump);