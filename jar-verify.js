/* Parse Lenovo UX Package BOM file and generate JSON object using Node.js
 * Written by Brian Bothwell (brian.bothwell@avagotech.com)
 *
 * To use, run: `node parse-bom.js <BOM file>` where <BOM file> is an XLSX BOM
 *
 * Requres:
 *  - Node.js
 *  - mkdirp
 *  - rimraf
 *  - xml2object
 *  - yauzl
 *  - bluebird*
 *
 *  * The bluebird module is only required when using older versions of Node.js
 *    which don't contain Promise support.
 */

var util        = require('util');
var path        = require('path');
var fs          = require('fs');

var mkdirp      = require('mkdirp');
var rmdir       = require('rimraf');
var xml2object  = require('xml2object');
var yauzl       = require('yauzl');

if (typeof Promise === 'undefined') Promise = require('bluebird');

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

// Function to gather all expected data from a JAR file
function getJarContent(jarType) {
  return new Promise(function (fulfill, reject) {
    yauzl.open(jarDir + jarFiles[jarType].fileName, function(err, zipfile) {
      if (err) {
        reject(err);
      } else {
        var errorMsg = null;
        var inputFileName = null;
        var inputFile = null;
        var changeFileName = null;
        var changeFile = '';
        var readmeFileName = null;
        var readmeFile = '';
        var xmlFileName = null;
        var xmlFile = null;
        var binFileName = null;
        zipfile.on("error", function(error) {
          reject(error);
        });
        zipfile.on("entry", function(entry) {
          if (entry.fileName.search(/input\/.+\.xml$/) > -1) {
            // Read input XML file data
            inputFileName = entry.fileName;
            zipfile.openReadStream(entry, function(err, readStream) {
              if (err) reject(err);
              var parser = new xml2object(['ibmUpdateData'], readStream);
              parser.on('object', function(name, obj) {
                  inputFile = obj;
              });
              parser.start();
            });
          } else if (entry.fileName.search(RegExp(config.pkgTypes[jarType].regex + '.+\.chg$')) > -1) {
            // Read change history file data
            changeFileName = entry.fileName;
            zipfile.openReadStream(entry, function(err, readStream) {
              if (err) reject(err);
              readStream.on("data", function(data) {
                changeFile += data;
              });
            });
          } else if (entry.fileName.search(RegExp(config.pkgTypes[jarType].regex + '.+\.txt$')) > -1) {
            // Read readme file data
            readmeFileName = entry.fileName;
            zipfile.openReadStream(entry, function(err, readStream) {
              if (err) reject(err);
              readStream.on("data", function(data) {
                readmeFile += data;
              });
            });
          } else if (entry.fileName.search(RegExp(config.pkgTypes[jarType].regex + '.+\.xml$')) > -1) {
            // Read XML file data
            xmlFileName = entry.fileName;
            zipfile.openReadStream(entry, function(err, readStream) {
              if (err) reject(err);
              var parser = new xml2object(['INSTANCE'], readStream);
              parser.on('object', function(name, obj) {
                  xmlFile = obj;
              });
              parser.start();
            });
          } else if (config.pkgTypes[jarType].osType === 'windows' && entry.fileName.search(RegExp(config.pkgTypes[jarType].regex + '.+\.exe$')) > -1) {
            binFileName = entry.fileName;
          } else if (config.pkgTypes[jarType].osType === 'linux' && config.pkgTypes[jarType].type === 'dd' && entry.fileName.search(RegExp(config.pkgTypes[jarType].regex + '.+\.tgz$')) > -1) {
            binFileName = entry.fileName;
          } else if (config.pkgTypes[jarType].osType === 'linux' && config.pkgTypes[jarType].type === 'fw' && entry.fileName.search(RegExp(config.pkgTypes[jarType].regex + '.+\.bin$')) > -1) {
            binFileName = entry.fileName;
          } else if (config.pkgTypes[jarType].osType === 'vmware' && config.pkgTypes[jarType].type === 'fw' && entry.fileName.search(RegExp(config.pkgTypes[jarType].regex + '.+\.bin$')) > -1) {
            binFileName = entry.fileName;
          }

          if (binFileName && entry.fileName === binFileName) {
            mkdirp(tempPath + jarType + '/', function(err) {
              if (err) reject(err);
              zipfile.openReadStream(entry, function(err, readStream) {
                if (err) reject(err);
                readStream.pipe(fs.createWriteStream(tempPath + jarType + '/' + entry.fileName));
              });
            });
          }
        });
        zipfile.on("close", function() {
          if (! inputFileName) {
            reject({jarType: jarType, code: 'NOINPUTFILE'});
          } else if (! changeFileName) {
            reject({jarType: jarType, code: 'NOCHANGEFILE'});
          } else if (! readmeFileName) {
            reject({jarType: jarType, code: 'NOREADMEFILE'});
          } else if (! xmlFileName) {
            reject({jarType: jarType, code: 'NOXMLFILE'});
          } else if (! binFileName) {
            reject({jarType: jarType, code: 'NOBINFILE'});
          } else {
            fulfill({
              jarType: jarType,
              inputFileName: inputFileName,
              inputFile: inputFile,
              changeFileName: changeFileName,
              changeFile: changeFile,
              readmeFileName: readmeFileName,
              readmeFile: readmeFile,
              xmlFileName: xmlFileName,
              xmlFile: xmlFile,
              binFileName: binFileName
            });
          }
        });
      }
    });
  });
}

function verifyInputXML(jarContent) {
  // console.log(jarContent.inputFileName);
  // console.log(JSON.stringify(jarContent.inputFile, null, 2));

  if (! jarContent.inputFile || ! jarContent.inputFile.version) {
    util.log("[ERROR] Parameter 'version' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
  } else {
    // Verify version
    var verMatch = jarContent.inputFile.version.match(/(.+)\-([0-9]+)$/);
    var pkgVersion = verMatch[1];
    var pkgSubversion = verMatch[2];
    var pkgAltVersion = null;

    if (config.pkgTypes[jarContent.jarType].type === 'fw' && config.pkgTypes[jarContent.jarType].preVersion) {
      var verSubMatch = pkgVersion.match(new RegExp('^' + config.pkgTypes[jarContent.jarType].preVersion + '(.+)$'));
      if (! verSubMatch) {
        util.log("[ERROR] Pre-version missing in 'version' parameter from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      } else {
        pkgVersion = verSubMatch[1];
      }
    }

    // Verify category.type
    if (! jarContent.inputFile.category || ! jarContent.inputFile.category.type) {
      util.log("[ERROR] Paramater 'category.type' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else {
      if (jarContent.inputFile.category.type !== workingBOM.release) {
        util.log("[ERROR] Invalid value for 'category.type' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      }
    }

    // Verify category
    if (! jarContent.inputFile.category || ! jarContent.inputFile.category.$t) {
      util.log("[ERROR] Paramater 'category' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else {
      if (config.pkgTypes[jarContent.jarType].type === 'dd') {
        var categoryMatch = config.pkgTypes[jarContent.jarType].proto;
      } else {
        var categoryMatch = null;
        config.asicTypes.forEach(function(asic) {
          if (asic.name === config.pkgTypes[jarContent.jarType].asic) categoryMatch = asic.type;
        });
      }
      if (jarContent.inputFile.category.$t !== categoryMatch) {
        util.log("[ERROR] Invalid value for 'category' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      }
    }

    // Verify vendor
    if (! jarContent.inputFile.vendor) {
      util.log("[ERROR] Paramater 'vendor' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else {
      if (! jarContent.inputFile.vendor.match(new RegExp('^' + config.vendor + '$'))) {
        util.log("[ERROR] Invalid value for 'vendor' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      }
    }

    // Verify rebootRequired
    if (! jarContent.inputFile.rebootRequired) {
      util.log("[ERROR] Paramater 'rebootRequired' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else {
      if (jarContent.inputFile.rebootRequired.toLowerCase() !== 'yes') {
        util.log("[ERROR] Invalid value for 'rebootRequired' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      }
    }

    // Verify updateType
    if (! jarContent.inputFile.updateType) {
      util.log("[ERROR] Paramater 'updateType' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else {
      if ((config.pkgTypes[jarContent.jarType].type === 'fw' && jarContent.inputFile.updateType.toLowerCase() !== 'firmware') ||
          (config.pkgTypes[jarContent.jarType].type === 'dd' && jarContent.inputFile.updateType.toLowerCase() !== 'driver')) {
        util.log("[ERROR] Invalid value for 'updateType' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      }
    }

    // Verify updateSelection
    if (! jarContent.inputFile.updateSelection) {
      util.log("[ERROR] Paramater 'updateSelection' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else {
      if (jarContent.inputFile.updateSelection.toLowerCase() !== 'auto') {
        util.log("[ERROR] Invalid value for 'updateSelection' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      }
    }

    // Verify applicableDeviceID entries
    if (! jarContent.inputFile.applicableDeviceIdLabel) {
      util.log("[ERROR] Paramater 'applicableDeviceIdLabel' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else {
      var jarDidList = jarContent.inputFile.applicableDeviceIdLabel;
      if (config.pkgTypes[jarContent.jarType].type === 'fw') {
        var bomDidList = workingBOM.appDIDList['fw'][config.pkgTypes[jarContent.jarType].os][config.pkgTypes[jarContent.jarType].asic];
      } else {
        var bomDidList = workingBOM.appDIDList['dd'][config.pkgTypes[jarContent.jarType].os][config.pkgTypes[jarContent.jarType].proto];
      }
      bomDidList.forEach(function(did) {
        if (jarDidList.indexOf(did) < 0) util.log("[ERROR] The ApplicableDeviceID '" + did + "' is missing from the input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      });
      jarDidList.forEach(function(did) {
        if (bomDidList.indexOf(did) < 0) util.log("[ERROR] The ApplicableDeviceID '" + did + "' is incorrectly included in the input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      });
    }

    // Verify osUpdateData

    // Verify description
    // Note: verification of description must be last, due to pieces of the string being pulled from above checks
    if (! jarContent.inputFile.description) {
      util.log("[ERROR] Parameter 'description' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else {
      var inputDesc = config.pkgTypes[jarContent.jarType].inputDesc.replace('##VERSION##', pkgVersion).replace('##RELEASE##', workingBOM.release);
      if (jarContent.inputFile.description !== inputDesc) {
        util.log("[ERROR] Invalid value for 'description' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
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
  return util.log("[ERROR] Unable to open configuration file.\n" + err);
}

// Initialization
var curDate = new Date();
var startTime = '' + curDate.getFullYear() + (curDate.getUTCMonth() + 1) + curDate.getDate() + curDate.getHours() + curDate.getMinutes() + curDate.getSeconds();
if (config.dataDir[config.dataDir.length - 1] !== '/') config.dataDir += '/';
if (config.tempDir[config.tempDir.length - 1] !== '/') config.tempDir += '/';
if (config.jarDir[config.jarDir.length - 1] !== '/') config.jarDir += '/';
var tempPath = config.tempDir + 'jar-verify-' + startTime + '/';

// Parse command-line parameters
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
var jarDir = config.jarDir + workingRelease + '/' + workingBuild + '/';

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
          jarVersion: matchResult[1]
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
for (var bomOS in workingBOM.appDIDList['fw']) {
  for (var bomASIC in workingBOM.appDIDList['fw'][bomOS]) {
    for (var pkg in config.pkgTypes) {
      if (config.pkgTypes[pkg].type === 'fw' && config.pkgTypes[pkg].os === bomOS && config.pkgTypes[pkg].asic === bomASIC) bomJarTypes.push(pkg);
    }
  }
}
for (var bomOS in workingBOM.appDIDList['dd']) {
  for (var bomProto in workingBOM.appDIDList['dd'][bomOS]) {
    for (var pkg in config.pkgTypes) {
      if (config.pkgTypes[pkg].type === 'dd' && config.pkgTypes[pkg].os === bomOS && config.pkgTypes[pkg].proto === bomProto) bomJarTypes.push(pkg);
    }
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
  getJarContent(jarType).then(function(jarContent) {
    // Verify input XML data
    verifyInputXML(jarContent);

    // Verify package XML data
    // console.log(jarContent.xmlFileName);
    // console.log(JSON.stringify(jarContent.xmlFile, null, 2));

    // Verify readme data
    // console.log(jarContent.readmeFileName);
    // console.log(jarContent.readmeFile);

    // Verify change history data
    // console.log(jarContent.changeFileName);
    // console.log(jarContent.changeFile);

    // Verify payload
    var payloadFile = tempPath + jarContent.jarType + '/' + jarContent.binFileName;

  }, function(err) {
    if (err.code === 'EACCES') {
      util.log("[ERROR] Permission denied trying to open JAR file: " + err.path);
    } else if (err.code === 'NOINPUTFILE') {
      util.log("[ERROR] The " + config.pkgTypes[err.jarType].name + " JAR file does not contain an input XML file. No further verification will be performed with this JAR file.");
    } else if (err.code === 'NOCHANGEFILE') {
      util.log("[ERROR] The " + config.pkgTypes[err.jarType].name + " JAR file does not contain a change history file. No further verification will be performed with this JAR file.");
    } else if (err.code === 'NOREADMEFILE') {
      util.log("[ERROR] The " + config.pkgTypes[err.jarType].name + " JAR file does not contain a readme file. No further verification will be performed with this JAR file.");
    } else if (err.code === 'NOXMLFILE') {
      util.log("[ERROR] The " + config.pkgTypes[err.jarType].name + " JAR file does not contain an XML file. No further verification will be performed with this JAR file.");
    } else if (err.code === 'NOBINFILE') {
      util.log("[ERROR] The " + config.pkgTypes[err.jarType].name + " JAR file does not contain a payload file. No further verification will be performed with this JAR file.");
    } else {
      util.log("[ERROR] Unexpected error: " + err);
    }
  }).catch(function(err) {
    console.dir(err);
  });
}

process.on('exit', function() {
  // Clean up temporary files
  rmdir.sync(tempPath, {gently: tempPath}, function(err) {
    if (err) util.log("[ERROR] Unable to delete temporary files: " + err);
  });
});