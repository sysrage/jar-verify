/* Generate SCM CFG files based on BOM file using Node.js
 * Written by Brian Bothwell (brian.bothwell@avagotech.com)
 *
 * To use, run: `node build-cfg.js <parameters>`
 *
 * Available Parameters:
 *  -r | --release  - (Required) Specifies the release name to verify.
 *
 * Note: The BOM file XLS must have already been parsed with parse-bom.js
 *
 * Requres:
 *  - Node.js
 */

var util        = require('util');
var fs          = require('fs');

/**************************************************************/
/* Function/Class Definitions                                 */
/**************************************************************/

// Function to parse command line parameters
function getParams() {
  var paramList = {}
  for (var i = 2; i < process.argv.length; i++) {
    var shortMatch = process.argv[i].match(/^\-([A-Za-z0-9\?])/);
    var longMatch = process.argv[i].match(/^\-\-([A-Za-z0-9\?]+)/);
    if (shortMatch) {
      if (process.argv[i + 1]) {
        if (process.argv[i + 1].search(/^\-/) > -1) {
          paramList[shortMatch[1]] = null;
        } else {
          paramList[shortMatch[1]] = process.argv[i + 1];
          i++;
        }
      } else {
        paramList[shortMatch[1]] = null;
      }
    } else if (longMatch) {
      if (process.argv[i].indexOf('=') > -1) {
        var paramSplit = process.argv[i].split('=');
        paramList[longMatch[1]] = paramSplit[1];
      } else {
        if (process.argv[i + 1]) {
          if (process.argv[i + 1].search(/^\-/) > -1) {
            paramList[longMatch[1]] = null;
          } else {
            paramList[longMatch[1]] = process.argv[i + 1];
            i++;
          }
        } else {
          paramList[longMatch[1]] = null;
        }
      }
    } else {
      paramList[process.argv[i]] = null;
    }
  }
  return paramList;
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

// Parse command-line parameters
var helpText = "Usage: node build-cfg.js <parameters> \n" +
  "\nAvailable Parameters:\n" +
  " -r | --release  - (Required) Specifies the release name to verify.\n";

var runParams = getParams();
var paramNames = Object.getOwnPropertyNames(runParams);

// Display help if no parameters or help parameters specified
if (paramNames.length < 1 || paramNames.indexOf('h') > -1 || paramNames.indexOf('help') > -1 || paramNames.indexOf('?') > -1) {
  return console.log(helpText);
}

// Verify specified release name is valid
if (runParams['r'] || runParams['release']) {
  if (runParams['r'] && runParams['r'].search(/^[0-9A-Za-z]+$/) > -1) {
    var workingRelease = runParams['r'].toUpperCase();
  } else if (runParams['release'] && runParams['release'].search(/^[0-9A-Za-z]+$/) > -1) {
    var workingRelease = runParams['release'].toUpperCase();
  } else {
    return util.log("[ERROR] Specified release name is invalid.\n");
  }
}

// Read BOM file for specified release
try {
  var workingBOM = JSON.parse(fs.readFileSync(config.dataDir + workingRelease + '-BOM.json'));
} catch (err) {
  if (err.code === 'ENOENT') {
    return util.log("[ERROR] The BOM file (" + config.dataDir + workingRelease + "-BOM.json) does not exist.\n");
  } else if (err.code === 'EACCES') {
    return util.log("[ERROR] Permission denied trying to open BOM file.\n");
  } else {
    return util.log("[ERROR] Unexpected error: " + err);
  }
}

// Build agentless.cfg file based on BOM
if (! workingBOM.adapterList) {
  util.log("[ERROR] No adapters found in BOM file.\n");
} else {
  var agentlessList = {};
  workingBOM.adapterList.forEach(function(adapter) {
    // Determine set of section names to use for this adapter
    for (var a = 0; a < config.asicTypes.length; a++) {
      if (config.asicTypes[a].name === adapter.asic) {
        var agentlessCfgNames = config.asicTypes[a].agentlessCfgNames;
      }
    }

    // Add each entry to the appropriate section
    adapter.agent.forEach(function(agent) {
      if (! agentlessList[agentlessCfgNames[agent.type]]) {
        agentlessList[agentlessCfgNames[agent.type]] = [agent.id];
      } else {
        if (agentlessList[agentlessCfgNames[agent.type]].indexOf(agent.id) < 0) agentlessList[agentlessCfgNames[agent.type]].push(agent.id);
      }
    });
  });

  // Format data as expected for agentless.cfg file
  var agentlessCfgDump = "";
  for (var type in agentlessList) {
    agentlessCfgDump += "[" + type + "]\n";
    agentlessList[type].forEach(function(entry) {
      agentlessCfgDump += entry + "\n";
    });
    agentlessCfgDump += "\n";
  }

  // Back up old agentless.cfg for this release then save new file
  var agentlessCfgFile = workingRelease + '-agentless.cfg';
  try {
    var oldCfg = fs.readFileSync(config.dataDir + agentlessCfgFile);
    var curDate = new Date();
    var buName = agentlessCfgFile + '-' + curDate.getFullYear() + (curDate.getUTCMonth() + 1) + curDate.getDate() + curDate.getHours() + curDate.getMinutes() + curDate.getSeconds();
    fs.writeFileSync(config.dataDir + buName, oldCfg);
    util.log("[INFO] An existing agentless.cfg file for this release has been backed up.");
  } catch (err) {
    if (err.code !== 'ENOENT') return util.log("[ERROR] Problem backing up old agentless.cfg file. New data will not be saved.\n" + err);
  }

  fs.writeFile(config.dataDir + agentlessCfgFile, agentlessCfgDump, function(err) {
    if (err) return util.log("[ERROR] Unable to write agentless.cfg data to disk.\n" + err);
    util.log("[INFO] All agentless.cfg data has been written to '" + config.dataDir + agentlessCfgFile + "'.");
  });
}


// Build app_dev_id.cfg file based on BOM
if (! workingBOM.appDIDList) {
  util.log("[ERROR] No Applicable Device ID entries found in BOM file.\n");
} else {
  var appDevIdList = {};
  for (var type in workingBOM.appDIDList) {
    for (var os in workingBOM.appDIDList[type]) {
      if (type === 'fw') {
        for (var asic in workingBOM.appDIDList[type][os]) {
          for (var pkgType in config.pkgTypes) {
            if (config.pkgTypes[pkgType].type === 'fw' && config.pkgTypes[pkgType].os === os && config.pkgTypes[pkgType].asic === asic) var sectionName = config.pkgTypes[pkgType].appDevIdCfgName;
          }
          if (! appDevIdList[sectionName]) {
            appDevIdList[sectionName] = workingBOM.appDIDList[type][os][asic];
          } else {
            workingBOM.appDIDList[type][os][asic].forEach(function(entry) {
              if (appDevIdList[sectionName].indexOf(entry) < 0) appDevIdList[sectionName].push(entry);
            });
          }
        }
      } else if (type === 'dd') {
        for (var proto in workingBOM.appDIDList[type][os]) {
          for (var pkgType in config.pkgTypes) {
            if (config.pkgTypes[pkgType].type === 'dd' && config.pkgTypes[pkgType].os === os && config.pkgTypes[pkgType].proto === proto) var sectionName = config.pkgTypes[pkgType].appDevIdCfgName;
          }
          if (! appDevIdList[sectionName]) {
            appDevIdList[sectionName] = workingBOM.appDIDList[type][os][proto];
          } else {
            workingBOM.appDIDList[type][os][proto].forEach(function(entry) {
              if (appDevIdList[sectionName].indexOf(entry) < 0) appDevIdList[sectionName].push(entry);
            });
          }
        }
      }
    }
  }

  // Format data as expected for app_dev_id.cfg file
  var appDevIdCfgDump = "";
  for (var type in appDevIdList) {
    appDevIdCfgDump += "[" + type + "]\n";
    appDevIdList[type].forEach(function(entry) {
      appDevIdCfgDump += entry + "\n";
    });
    appDevIdCfgDump += "\n";
  }

  // Back up old app_dev_id.cfg for this release then save new file
  var appDevIdCfgFile = workingRelease + '-app_dev_id.cfg';
  try {
    var oldCfg = fs.readFileSync(config.dataDir + appDevIdCfgFile);
    var curDate = new Date();
    var buName = appDevIdCfgFile + '-' + curDate.getFullYear() + (curDate.getUTCMonth() + 1) + curDate.getDate() + curDate.getHours() + curDate.getMinutes() + curDate.getSeconds();
    fs.writeFileSync(config.dataDir + buName, oldCfg);
    util.log("[INFO] An existing app_dev_id.cfg file for this release has been backed up.");
  } catch (err) {
    if (err.code !== 'ENOENT') return util.log("[ERROR] Problem backing up old app_dev_id.cfg file. New data will not be saved.\n" + err);
  }

  fs.writeFile(config.dataDir + appDevIdCfgFile, appDevIdCfgDump, function(err) {
    if (err) return util.log("[ERROR] Unable to write app_dev_id.cfg data to disk.\n" + err);
    util.log("[INFO] All app_dev_id.cfg data has been written to '" + config.dataDir + appDevIdCfgFile + "'.");
  });
}

