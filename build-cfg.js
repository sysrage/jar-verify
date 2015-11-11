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

// Function to write data to a file but make a backup first if file already exists
function writeWithBackup(file, data, description) {
  try {
    var curDate = new Date();
    var dateString = '' + curDate.getFullYear() + (curDate.getUTCMonth() + 1) + curDate.getDate() + curDate.getHours() + curDate.getMinutes() + curDate.getSeconds();
    var backupFile = file + '-' + dateString;
    var oldFile = fs.readFileSync(file);
    if (! description) var description = "";
    fs.writeFileSync(backupFile, oldFile);
    util.log("[INFO] An existing " + description + "file for this release has been backed up.");
  } catch (err) {
    if (err.code !== 'ENOENT') return util.log("[ERROR] Problem backing up old " + description + "file. New data will not be saved.\n" + err);
  }

  fs.writeFile(file, data, function(err) {
    if (err) return util.log("[ERROR] Unable to write " + description + "file to disk.\n" + err);
    util.log("[INFO] The " + description + "file has been written to '" + file + "'.");
  });
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
  writeWithBackup(config.dataDir + workingRelease + '-agentless.cfg', agentlessCfgDump, 'agentless.cfg ');
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
  writeWithBackup(config.dataDir + workingRelease + '-app_dev_id.cfg', appDevIdCfgDump, 'app_dev_id.cfg ');
}

// Build base.cfg file based on BOM
if (! workingBOM.osList) {
  util.log("[ERROR] No Operating System entries found in BOM file.\n");
} else if (! workingBOM.adapterList) {
  util.log("[ERROR] No adapters found in BOM file.\n");
} else {
  // Build entries for [BASE] section
  var baseArchitectures = [];
  var baseLinux = {};
  var baseVmware = [];
  var baseWindows = [];
  var baseAsics = [];
  var baseLinDrivers = [];
  var baseWinDrivers = [];
  var baseMTMs = [];
  workingBOM.osList.forEach(function(os) {
    if (baseArchitectures.indexOf(os.arch) < 0) baseArchitectures.push(os.arch);
    if (os.type === 'linux') {
      os.pkgsdkName.forEach(function(sdkName) {
        if (! baseLinux[sdkName]) {
          baseLinux[sdkName] = {
            ddName: os.ddName,
            subVersions: [os.subVersion]
          };
        } else {
          if (baseLinux[sdkName].subVersions.indexOf(os.subVersion) < 0) baseLinux[sdkName].subVersions.push(os.subVersion);
        }
      });
    } else if (os.type === 'windows') {
      os.pkgsdkName.forEach(function(sdkName) {
        if (baseWindows.indexOf(sdkName) < 0) baseWindows.push(sdkName);
      });
    } else if (os.type === 'vmware') {
      os.pkgsdkName.forEach(function(sdkName) {
        if (baseVmware.indexOf(sdkName) < 0) baseVmware.push(sdkName);
      });
    }
  });
  workingBOM.adapterList.forEach(function(adapter) {
    adapter.mtm.forEach(function(mtm) {
      if (baseMTMs.indexOf(mtm) < 0 ) baseMTMs.push(mtm);
    });
    if (baseAsics.indexOf(adapter.asic) < 0) {
      baseAsics.push(adapter.asic);
      for (var a = 0; a < config.asicTypes.length; a++) {
        if (config.asicTypes[a].name === adapter.asic) {
          var asicType = config.asicTypes[a].type;
          break;
        }
      }
      if (asicType === 'cna') var baseProtos = ['cna', 'iscsi', 'nic'];
      else var baseProtos = [asicType];
      baseProtos.forEach(function(proto) {
        if (baseWinDrivers.indexOf(proto.replace('cna', 'fcoe')) < 0) baseWinDrivers.push(proto.replace('cna', 'fcoe'));
        for (var p in config.pkgTypes) {
          if (config.pkgTypes[p].osType === 'linux' && config.pkgTypes[p].type === 'dd' && config.pkgTypes[p].proto === proto) {
            config.pkgTypes[p].ddFileName.forEach(function(dd) {
              var ddShort = dd.replace('.ko', '');
              if (baseLinDrivers.indexOf(ddShort) < 0) baseLinDrivers.push(ddShort);
            });
          }
        }
      });
    }
  });

  // Format [BASE] data as expected for base.cfg file
  var baseDump = "[BASE]\nstaging = DESTDIR";

  // This needs to be cleaned up
  baseDump += "\narchitectures = ";
  var first = true;
  baseArchitectures.forEach(function(arch) {
    if (! first) baseDump += ",";
    first = false;
    if (arch === 'x86') baseDump += 'i386';
    if (arch === 'x64') baseDump += 'x86_64';
  });

  baseDump += "\nlinux = ";
  var first = true;
  for (var os in baseLinux) {
    if (! first) baseDump += ",";
    first = false;
    baseDump += os.toLowerCase();
  }

  baseDump += "\nlinux_os = ";
  var first = true;
  for (var os in baseLinux) {
    if (! first) baseDump += ",";
    first = false;
    baseDump += baseLinux[os].ddName;
  }

  baseDump += "\nvmware = ";
  var first = true;
  baseVmware.forEach(function(os) {
    if (! first) baseDump += ",";
    first = false;
    baseDump += os;
  });

  baseDump += "\nwindows = ";
  var first = true;
  baseWindows.forEach(function(os) {
    if (! first) baseDump += ",";
    first = false;
    baseDump += os;
  });

  baseDump += "\nfwsupport = ";
  var first = true;
  baseAsics.forEach(function(asic) {
    if (! first) baseDump += ",";
    first = false;
    baseDump += asic.toLowerCase();
  });

  baseDump += "\nlinux_drivers = ";
  var first = true;
  baseLinDrivers.forEach(function(dd) {
    if (! first) baseDump += ",";
    first = false;
    baseDump += dd;
  });

  baseDump += "\nwindows_drivers = ";
  var first = true;
  baseWinDrivers.forEach(function(dd) {
    if (! first) baseDump += ",";
    first = false;
    baseDump += dd;
  });

  baseDump += "\nmtm = ";
  var first = true;
  baseMTMs.forEach(function(mtm) {
    if (! first) baseDump += ",";
    first = false;
    baseDump += mtm;
  });

  baseDump += "\nautochangelogs = False\nelxflashstandalone =  True";

  // Format driver subversion data as expected for base.cfg file
  baseDump += "\n\n[DRIVER SUBVERSIONS]";
  baseDump += "\nwindows_fc = 1";
  baseDump += "\nwindows_fcoe = 1";
  baseDump += "\nwindows_nic = 1";
  baseDump += "\nwindows_iscsi = 1";
  baseDump += "\n\n[LNX_DRIVER]";
  baseDump += "\nlinux_nic = 1";
  baseDump += "\nlinux_iscsi = 1";
  baseDump += "\nlinux_lpfc = 1";

  // Format Linux OS version data as expected for base.cfg file
  for (var os in baseLinux) {
    baseDump += "\n\n[" + os + "]";
    baseLinux[os].subVersions.forEach(function(sub) {
      if (sub === '0') baseDump += "\n" + baseLinux[os].ddName;
      if (sub !== '0' && os.indexOf('RHEL') > -1) baseDump += "\n" + baseLinux[os].ddName + "." + sub;
      if (sub !== '0' && os.indexOf('SLES') > -1) baseDump += "\n" + baseLinux[os].ddName + "-sp" + sub;
    });
  }

  // Build entries for firmware sections
  var fwData = {};
  var cASIC = {};
  baseAsics.forEach(function(asic) {
    if (! fwData[asic]) fwData[asic] = {};
    for (var a = 0; a < config.asicTypes.length; a++) {
      if (config.asicTypes[a].name === asic) {
        cASIC = config.asicTypes[a];
        break;
      }
    }

    workingBOM.adapterList.forEach(function(adapter) {
      if (adapter.asic === asic) {
        if (! fwData[asic][cASIC.fwCfgNames[adapter.type]]) {
          fwData[asic][cASIC.fwCfgNames[adapter.type]] = {type: 'fw', names: cASIC.fwMatrixNames[adapter.type].concat(), boards: adapter.v2.concat()}
        } else {
          cASIC.fwMatrixNames[adapter.type].forEach(function(name) {
            if (fwData[asic][cASIC.fwCfgNames[adapter.type]].names.indexOf(name) < 0) fwData[asic][cASIC.fwCfgNames[adapter.type]].names.push(name);
          });
          adapter.v2.forEach(function(v2) {
            if (fwData[asic][cASIC.fwCfgNames[adapter.type]].boards.indexOf(v2) < 0) fwData[asic][cASIC.fwCfgNames[adapter.type]].boards.push(v2);
          });
        }
        if (cASIC.bootCfgNames) {
          if (! fwData[asic][cASIC.bootCfgNames[adapter.type]]) {
            fwData[asic][cASIC.bootCfgNames[adapter.type]] = {type: 'boot', names: cASIC.fwMatrixNames[adapter.type].concat(), boards: adapter.v2.concat()}
          } else {
            cASIC.fwMatrixNames[adapter.type].forEach(function(name) {
              if (fwData[asic][cASIC.bootCfgNames[adapter.type]].names.indexOf(name) < 0) fwData[asic][cASIC.bootCfgNames[adapter.type]].names.push(name);
            });
            adapter.v2.forEach(function(v2) {
              if (fwData[asic][cASIC.bootCfgNames[adapter.type]].boards.indexOf(v2) < 0) fwData[asic][cASIC.bootCfgNames[adapter.type]].boards.push(v2);
            });
          }
        }
        if (! fwData[asic].mtmList) {
          fwData[asic].mtmList = adapter.mtm.concat();
        } else {
          adapter.mtm.forEach(function(mtm) {
            if (fwData[asic].mtmList.indexOf(mtm) < 0) fwData[asic].mtmList.push(mtm);
          });
        }
      }
    });
  });

  // Format firmware section data as expected for base.cfg file
  for (var asic in fwData) {
    baseDump += "\n\n[" + asic.toUpperCase() + "]\nfw = ";
    var firstFW = true;
    var firstBoot = true;
    var bootList = '';
    for (var fwType in fwData[asic]) {
      if (fwData[asic][fwType].type === 'fw') {
        if (! firstFW) baseDump += ",";
        firstFW = false;
        baseDump += fwType;
      } else if (fwData[asic][fwType].type === 'boot') {
        if (! firstBoot) bootList += ",";
        firstBoot = false;
        bootList += fwType;
      }
    }

    if (bootList) baseDump += "\nboot = " + bootList;

    baseDump += "\nmtm = ";
    var first = true;
    fwData[asic].mtmList.forEach(function(mtm) {
      if (! first) baseDump += ",";
      first = false;
      baseDump += mtm;
    });

    baseDump += "\ncfl = /home/integrat/toe/firmware/tetra_cfl";

    baseDump += "\nsubversion = 1";

    for (var fwType in fwData[asic]) {
      if (fwType !== 'mtmList') {
        baseDump += "\n\n[" + fwType.toUpperCase() + "]";

        baseDump += "\nname = ";
        var first = true;
        fwData[asic][fwType].names.forEach(function(name) {
          if (! first) baseDump += ",";
          first = false;
          baseDump += name;
        });
        baseDump += "\n[" + fwType.toUpperCase() + "-BOARDS]";

        fwData[asic][fwType].boards.forEach(function(board) {
          baseDump += "\n" + board;
        });
      }
    }
  }

  baseDump += "\n";

  // Back up old base.cfg for this release then save new file
  writeWithBackup(config.dataDir + workingRelease + '-base.cfg', baseDump, 'base.cfg ');
}
