/* Parse Lenovo UX Package BOM file and generate JSON object using Node.js
 * Written by Brian Bothwell (brian.bothwell@avagotech.com)
 *
 * To use, run: `node parse-bom.js <BOM file>` where <BOM file> is an XLSX BOM
 *
 * Requres:
 *  - Node.js
 *  - yauzl
 *  - bluebird*
 *
 *  * The bluebird module is only required when using older versions of Node.js
 *    which don't contain Promise support.
 */

var util    = require('util');
var path    = require('path');
var fs      = require('fs');

var yauzl   = require('yauzl');

if (typeof Promise === 'undefined') Promise = require('bluebird');

// Read configuration file
try {
  var config = require('./config.js');
} catch (err) {
  return util.log("[ERROR] Unable to open configuration file.\n" + err);
}

var helpText = "Usage: node jar-verify.js <parameters> \n" +
  "\nAvailable Parameters:\n" +
  " -b | --build    - (Required) Specifies the build number to verify.\n" +
  " -r | --release  - (Required) Specifies the release name to verify.\n" +
  " -s | --save     - Save the specified release/build as a delivered build.";

var runParams = getParams();
var paramNames = Object.getOwnPropertyNames(runParams);

// Display help if no parameters or help parameters specified
if (paramNames.length < 1 || paramNames.indexOf('h') > -1 || paramNames.indexOf('help') > -1 || paramNames.indexOf('?') > -1) {
  return console.log(helpText);
}

// Verify specified build number is valid
if (runParams['b'] || runParams['build']) {
  if (runParams['b'] && runParams['b'].search(/^[0-9]+(?:[0-9\.]+)?$/) > -1) {
    var workingBuild = runParams['b'];
  } else if (runParams['build'] && runParams['build'].search(/^[0-9]+(?:[0-9\.]+)?$/) > -1) {
    var workingBuild = runParams['build'];
  } else {
    return util.log("[ERROR] Specified build number is invalid.");
  }
}

// Verify specified release name is valid
if (runParams['r'] || runParams['release']) {
  if (runParams['r'] && runParams['r'].search(/^[0-9A-Za-z]+$/) > -1) {
    var workingRelease = runParams['r'].toUpperCase();
  } else if (runParams['release'] && runParams['release'].search(/^[0-9A-Za-z]+$/) > -1) {
    var workingRelease = runParams['release'].toUpperCase();
  } else {
    return util.log("[ERROR] Specified release name is invalid.");
  }
}

// Set jarDir to correct location based on release name and build number
if (! workingBuild || ! workingRelease) return util.log("[ERROR] Release name and build number must be specified.\n" + helpText);
var jarDir = config.jarDir + '/' + workingRelease + '/' + workingBuild + '/';

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

// Gather list of JAR files in jarDir
try {
  var jarDirFiles = fs.readdirSync(jarDir);
} catch (err) {
  if (err.code === 'ENOENT') {
    return util.log("[ERROR] The JAR file directory (" + jarDir + ") does not exist.\n");
  } else if (err.code === 'EACCES') {
    return util.log("[ERROR] Permission denied trying to open JAR file directory.\n");
  } else {
    return util.log("[ERROR] Unexpected error: " + err);
  }
}

// Remove all files/directories from jarFiles array which don't end in .jar
for (var i = 0; i < jarDirFiles.length; i++) {
  if (jarDirFiles[i].search(/\.jar$/i) < 0) {
    jarDirFiles.splice(i, 1);
    i--;
  }
}

// Quit if no JAR files are found for the specified release/build
if (jarDirFiles.length < 1) return util.log("[ERROR] No JAR files found in '" + jarDir + "'.\n");

// Match each JAR file to the expected package types
var jarFiles = {};
jarDirFiles.forEach(function (jar) {
  var matched = false;
  for (i in config.pkgTypes) {
    var matchResult = jar.match(config.pkgTypes[i].regex);
    if (matchResult) {
      matched = true;
      if (! jarFiles[i]) {
        jarFiles[i] = {
          fileName: jar,
          jarVersion: matchResult[1],
          type: config.pkgTypes[i].type,
          os: config.pkgTypes[i].os,
          proto: config.pkgTypes[i].proto
        };
      } else {
        util.log("[WARNING] The " + config.pkgTypes[i].name + " package was matched to multiple JAR files. Ignored: " + jar + ".");
      }
    }
  }
  if (! matched) util.log("[WARNING] The JAR file '" + jar + "' did not match any expected names and will be ignored.");
});

// Build list of expected JAR files based on BOM
var bomJarTypes = [];
for (var pkgType in workingBOM.appDIDList) {
  switch (pkgType) {
    case 'ddWinNIC':
      bomJarTypes.push('ddWinNIC');
      break;
    case 'ddWinISCSI':
      bomJarTypes.push('ddWinISCSI');
      break;
    case 'ddWinFC':
      bomJarTypes.push('ddWinFC');
      break;
    case 'ddWinFCoE':
      bomJarTypes.push('ddWinFCoE');
      break;
    case 'ddLinNIC':
      workingBOM.osList.forEach(function(os) {
        if (os.type === 'linux') {
          if (bomJarTypes.indexOf('dd' + os.ddName.toUpperCase() + 'NIC') < 0) bomJarTypes.push('dd' + os.ddName.toUpperCase() + 'NIC');
        }
      });
      break;
    case 'ddLinISCSI':
      workingBOM.osList.forEach(function(os) {
        if (os.type === 'linux') {
          if (bomJarTypes.indexOf('dd' + os.ddName.toUpperCase() + 'ISCSI') < 0) bomJarTypes.push('dd' + os.ddName.toUpperCase() + 'ISCSI');
        }
      });
      break;
    case 'ddLinFC':
      workingBOM.osList.forEach(function(os) {
        if (os.type === 'linux') {
          if (bomJarTypes.indexOf('dd' + os.ddName.toUpperCase() + 'FC') < 0) bomJarTypes.push('dd' + os.ddName.toUpperCase() + 'FC');
        }
      });
      break;
    case 'fwSaturn':
      workingBOM.osList.forEach(function(os) {
        if (os.type === 'linux') {
          if (bomJarTypes.indexOf('fwSaturnLinux') < 0) bomJarTypes.push('fwSaturnLinux');
        } else if (os.type === 'windows') {
          if (bomJarTypes.indexOf('fwSaturnWindows') < 0) bomJarTypes.push('fwSaturnWindows');
        } else if (os.type === 'vmware') {
          if (bomJarTypes.indexOf('fwSaturnVMware') < 0) bomJarTypes.push('fwSaturnVMware');
        }
      });
      break;
    case 'fwLancer':
      workingBOM.osList.forEach(function(os) {
        if (os.type === 'linux') {
          if (bomJarTypes.indexOf('fwLancerLinux') < 0) bomJarTypes.push('fwLancerLinux');
        } else if (os.type === 'windows') {
          if (bomJarTypes.indexOf('fwLancerWindows') < 0) bomJarTypes.push('fwLancerWindows');
        } else if (os.type === 'vmware') {
          if (bomJarTypes.indexOf('fwLancerVMware') < 0) bomJarTypes.push('fwLancerVMware');
        }
      });
      break;
    case 'fwBE':
      workingBOM.osList.forEach(function(os) {
        if (os.type === 'linux') {
          if (bomJarTypes.indexOf('fwBELinux') < 0) bomJarTypes.push('fwBELinux');
        } else if (os.type === 'windows') {
          if (bomJarTypes.indexOf('fwBEWindows') < 0) bomJarTypes.push('fwBEWindows');
        } else if (os.type === 'vmware') {
          if (bomJarTypes.indexOf('fwBEVMware') < 0) bomJarTypes.push('fwBEVMware');
        }
      });
      break;
    case 'fwSkyhawk':
      workingBOM.osList.forEach(function(os) {
        if (os.type === 'linux') {
          if (bomJarTypes.indexOf('fwSkyhawkLinux') < 0) bomJarTypes.push('fwSkyhawkLinux');
        } else if (os.type === 'windows') {
          if (bomJarTypes.indexOf('fwSkyhawkWindows') < 0) bomJarTypes.push('fwSkyhawkWindows');
        } else if (os.type === 'vmware') {
          if (bomJarTypes.indexOf('fwSkyhawkVMware') < 0) bomJarTypes.push('fwSkyhawkVMware');
        }
      });
      break;
  }
}

// Show error if expected JAR file is missing (as compared to BOM)
bomJarTypes.forEach(function (jarType) {
  if (! jarFiles[jarType]) util.log("[ERROR] The " + config.pkgTypes[jarType].name + " JAR file cannot be found.");
});

// Show warning if unexpected JAR file exists (as compared to BOM)
for (jarType in jarFiles) {
  if (bomJarTypes.indexOf(jarType) < 0) {
    util.log("[WARNING] Unexpected JAR file will be ignored: " + jarFiles[jarType].fileName);
    delete jarFiles[jarType];
  }
}

// All items in jarFiles should now be valid - begin verification
for (jarType in jarFiles) {
  getZipEntries(jarType).then(function(entries) {
    // Verify JAR file contains all necessary components (input XML, XML, readme, change history, and payload)
    if (verifyJarEntries(entries)) {
      console.log('continuing with: ' + entries.jarType);
      // Verify input XML

      // Verify XML

      // Verify readme

      // Verify change history

    }
  }, function(err) {
    if (err.code === 'EACCES') {
      util.log("[ERROR] Permission denied trying to open JAR file: " + err.path);
    } else {
      util.log("[ERROR] Unexpected error: " + err);
    }
  });
}

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

function getZipEntries(jarType) {
  return new Promise(function (fulfill, reject) {
    var entries = [];
    yauzl.open(jarDir + jarFiles[jarType].fileName, function(err, zipfile) {
      if (err) {
        reject(err);
      } else {
        zipfile.on("entry", function(entry) {
          entries.push(entry);
        });
        zipfile.on("close", function() {
          fulfill({jarType: jarType, data: entries});
        });
      }
    });
  });
}

function verifyJarEntries(entries) {
  var inputFileExists = false;
  var changeFileExists = false;
  var readmeFileExists = false;
  var xmlFileExists = false;
  var binFileExists = false;
  for (var i = 0; i < entries.data.length; i++) {
    if (entries.data[i].fileName.search(/input\/.+\.xml$/) > -1) {
      inputFileExists = true;
      var inputFileEntry = i;
    } else if (entries.data[i].fileName.search(RegExp(config.pkgTypes[entries.jarType] + '.+\.chg$')) > -1) {
      changeFileExists = true;
      var changeFileEntry = i;
    } else if (entries.data[i].fileName.search(RegExp(config.pkgTypes[entries.jarType] + '.+\.txt$')) > -1) {
      readmeFileExists = true;
      var readmeFileEntry = i;
    } else if (entries.data[i].fileName.search(RegExp(config.pkgTypes[entries.jarType] + '.+\.xml$')) > -1) {
      xmlFileExists = true;
      var xmlFileEntry = i;
    } else if (config.pkgTypes[entries.jarType].os === 'windows' && entries.data[i].fileName.search(RegExp(config.pkgTypes[entries.jarType] + '.+\.exe$')) > -1) {
      binFileExists = true;
      var binFileEntry = i;
    } else if (config.pkgTypes[entries.jarType].os === 'linux' && config.pkgTypes[entries.jarType].type === 'dd' && entries.data[i].fileName.search(RegExp(config.pkgTypes[entries.jarType] + '.+\.tgz$')) > -1) {
      binFileExists = true;
      var binFileEntry = i;
    } else if (config.pkgTypes[entries.jarType].os === 'linux' && config.pkgTypes[entries.jarType].type === 'fw' && entries.data[i].fileName.search(RegExp(config.pkgTypes[entries.jarType] + '.+\.bin$')) > -1) {
      binFileExists = true;
      var binFileEntry = i;
    } else if (config.pkgTypes[entries.jarType].os === 'vmware' && config.pkgTypes[entries.jarType].type === 'fw' && entries.data[i].fileName.search(RegExp(config.pkgTypes[entries.jarType] + '.+\.bin$')) > -1) {
      binFileExists = true;
      var binFileEntry = i;
    }
  }
  if (! inputFileExists) {
    util.log("[ERROR] The " + config.pkgTypes[entries.jarType].name + " JAR file does not contain an input XML file. No further verification will be performed with this JAR file.");
  } else if (! changeFileExists) {
    util.log("[ERROR] The " + config.pkgTypes[entries.jarType].name + " JAR file does not contain a change history file. No further verification will be performed with this JAR file.");
  } else if (! readmeFileExists) {
    util.log("[ERROR] The " + config.pkgTypes[entries.jarType].name + " JAR file does not contain a readme file. No further verification will be performed with this JAR file.");
  } else if (! xmlFileExists) {
    util.log("[ERROR] The " + config.pkgTypes[entries.jarType].name + " JAR file does not contain an XML file. No further verification will be performed with this JAR file.");
  } else if (! binFileExists) {
    util.log("[ERROR] The " + config.pkgTypes[entries.jarType].name + " JAR file does not contain a payload file. No further verification will be performed with this JAR file.");
  } else {
    return true;
  }
  return false;
}