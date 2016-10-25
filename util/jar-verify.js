#!/usr/bin/env node
/* Verify UX Package JAR files based on BOM file using Node.js
 * Written by Brian Bothwell (brian.bothwell@broadcom.com)
 *
 * To use, run: `node jar-verify.js <parameters>`
 *
 * Available Parameters:
 *  -b | --build    - (Required) Specifies the build number to verify.
 *  -r | --release  - (Required) Specifies the release name to verify.
 *  -s | --save     - Save the specified release/build as a delivered build.
 *  -u | --unsave   - Unsave (remove) the specified release/build as a delivered build.
 *  -j | --jardir   - Specify directory where JAR files can be found.
 *  -d | --debug    - Display and log additional debug messages.
 *
 * Note: The BOM file XLS must have already been parsed with parse-bom.js
 *
 * Requres:
 *  - Node.js
 *  - decompress
 *  - mkdirp
 *  - rimraf
 *  - xml2object
 *  - yauzl
 *  - bluebird*
 *
 *  * The bluebird module is only required when using older versions of Node.js
 *    which don't contain Promise support.
 */

var crypto      = require('crypto');
var exec        = require('child_process').exec;
var fs          = require('fs');
var path        = require('path');
var stream      = require('stream');

var Decompress  = require('decompress');
var mkdirp      = require('mkdirp');
var rmdir       = require('rimraf');
var xml2object  = require('xml2object');
var yauzl       = require('yauzl');

if (typeof Promise === 'undefined') Promise = require('bluebird');

var logger      = require('./logger.js');
logger.scriptName = path.basename(__filename, '.js');

/**************************************************************/
/* Function/Class Definitions                                 */
/**************************************************************/

// Function to compare two version strings
function compareVersion(v1, v2) {
  // returns  1 if v1 > v2 (v2 is older)
  // returns -1 if v1 < v2 (v1 is older)
  // returns  0 if v1 = v2

  if (v1 === v2) {
    return 0;
  } else {
    var partsTemp = {
      v1: v1.split('.'),
      v2: v2.split('.')
    };

    var parts = {};
    Object.keys(partsTemp).forEach(function(p) {
      parts[p] = [];
      for (var i = 0; i < partsTemp[p].length; i++) {
        var match = partsTemp[p][i].match(/([0-9]+)([^0-9]+)([0-9]+)/);
        if (match) {
          parts[p].push(match[1]);
          parts[p].push(match[2].toLowerCase());
          parts[p].push(match[3]);
        } else {
          parts[p].push(partsTemp[p][i]);
        }
      }
    });

    for (var i = 0; i < parts['v1'].length; i++) {
      if (parts['v2'].length == i) {
        return 1;
      }

      Object.keys(parts).forEach(function(v) {
        if (parts[v][i].match(/[0-9]+/)) parts[v][i] = parseInt(parts[v][i]);
      });

      if (parts['v1'][i] == parts['v2'][i]) {
        continue;
      } else if (parts['v1'][i] > parts['v2'][i]) {
        return 1;
      } else {
        return -1;
      }

    }
    return 0;
  }
}

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

// Function to obtain checksum of a file
function getFileChecksum(file, callback) {
  var fileHash = crypto.createHash('md5');
  fileHash.setEncoding('hex');
  var fd = fs.createReadStream(file);
  fd.on('end', function() {
    fileHash.end();
    callback(fileHash.read());
  });
  fd.pipe(fileHash);
}

// Function to gather all expected data from a JAR file
function getJarContent(jarType) {
  return new Promise(function(fulfill, reject) {
    yauzl.open(jarDir + jarFiles[jarType].fileName, function(err, zipfile) {
      if (err) {
        reject(err);
      } else {
        var inputFileName = null;
        var inputFile = null;
        var inputFileChecksum = null;
        var changeFileName = null;
        var changeFile = '';
        var changeFileChecksum = null;
        var readmeFileName = null;
        var readmeFile = '';
        var readmeFileChecksum = null;
        var xmlFileName = null;
        var xmlFile = null;
        var xmlFileChecksum = null;
        var binFileName = null;
        var binFileChecksum = null;
        zipfile.on("error", function(error) {
          reject(error);
        });
        zipfile.on("entry", function(entry) {
          if (entry.fileName.search(/input\/.+\.xml$/) > -1) {
            // Read input XML file data
            inputFileName = entry.fileName;
            var inputFileHash = crypto.createHash('md5');
            zipfile.openReadStream(entry, function(err, readStream) {
              if (err) reject(err);
              // Add data to checksum hash
              readStream.on('data', function(data) {
                inputFileHash.update(data);
              });
              readStream.on('end', function() {
                inputFileChecksum = inputFileHash.digest('hex');
              });
              // Parse XML data
              var parser = new xml2object(['lnvgyUpdateData'], readStream);
              parser.on('object', function(name, obj) {
                  inputFile = obj;
              });
              parser.start();
            });
          } else if (entry.fileName.search(RegExp(config.pkgTypes[jarType].regex + '.+\.chg$')) > -1) {
            // Read change history file data
            changeFileName = entry.fileName;
            var changeFileHash = crypto.createHash('md5');
            zipfile.openReadStream(entry, function(err, readStream) {
              if (err) reject(err);
              readStream.on('data', function(data) {
                changeFile += data;
                changeFileHash.update(data);
              });
              readStream.on('end', function() {
                changeFileChecksum = changeFileHash.digest('hex');
              });
            });
          } else if (entry.fileName.search(RegExp(config.pkgTypes[jarType].regex + '.+\.txt$')) > -1) {
            // Read readme file data
            readmeFileName = entry.fileName;
            var readmeFileHash = crypto.createHash('md5');
            zipfile.openReadStream(entry, function(err, readStream) {
              if (err) reject(err);
              readStream.on('data', function(data) {
                readmeFile += data;
                readmeFileHash.update(data);
              });
              readStream.on('end', function() {
                readmeFileChecksum = readmeFileHash.digest('hex');
              });
            });
          } else if (entry.fileName.search(RegExp(config.pkgTypes[jarType].regex + '.+\.xml$')) > -1) {
            // Read XML file data
            xmlFileName = entry.fileName;
            var xmlFileHash = crypto.createHash('md5');
            zipfile.openReadStream(entry, function(err, readStream) {
              if (err) reject(err);
              // Add data to checksum hash
              readStream.on('data', function(data) {
                xmlFileHash.update(data);
              });
              readStream.on('end', function() {
                xmlFileChecksum = xmlFileHash.digest('hex');
              });
              // Parse XML data
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
              var binFileHash = crypto.createHash('md5');
              zipfile.openReadStream(entry, function(err, readStream) {
                if (err) reject(err);
                // Add data to checksum hash
                readStream.on('data', function(data) {
                  binFileHash.update(data);
                });
                readStream.on('end', function() {
                  binFileChecksum = binFileHash.digest('hex');
                });
                // Write payload binary to disk for further verification
                var binWriteStream = fs.createWriteStream(tempPath + jarType + '/' + entry.fileName);
                readStream.pipe(binWriteStream);

                // TODO: Does this need to be moved? Can writing of the binary file ever finish before
                // zipfile is closed (all other files are parsed)? If it's in the zipfile.on('close')
                // section, verifyPayloadFile() is called before binary has finished writing to disk.
                binWriteStream.on('finish', function() {
                  fulfill({
                    jarType: jarType,
                    inputFileName: inputFileName,
                    inputFile: inputFile,
                    inputFileChecksum: inputFileChecksum,
                    changeFileName: changeFileName,
                    changeFile: changeFile,
                    changeFileChecksum: changeFileChecksum,
                    readmeFileName: readmeFileName,
                    readmeFile: readmeFile,
                    readmeFileChecksum: readmeFileChecksum,
                    xmlFileName: xmlFileName,
                    xmlFile: xmlFile,
                    xmlFileChecksum: xmlFileChecksum,
                    binFileName: binFileName,
                    binFileChecksum: binFileChecksum
                  });
                });
              });
            });
          }
        });
        zipfile.on("close", function() {
          if (! inputFileName || ! intputFile) {
            reject({jarType: jarType, code: 'NOINPUTFILE'});
          } else if (! changeFileName || ! changeFile) {
            reject({jarType: jarType, code: 'NOCHANGEFILE'});
          } else if (! readmeFileName || ! readmeFile) {
            reject({jarType: jarType, code: 'NOREADMEFILE'});
          } else if (! xmlFileName || ! xmlFile) {
            reject({jarType: jarType, code: 'NOXMLFILE'});
          } else if (! binFileName) {
            reject({jarType: jarType, code: 'NOBINFILE'});
          }
        });
      }
    });
  });
}

// Function to write saved data to disk
function putSavedData() {
  fs.writeFile(config.dataDir + dataFileName, JSON.stringify(savedData, null, 2), function(err) {
    if (err) {
      logger.log('ERROR', "Unable to write JAR data to disk.\n" + err);
    } else {
      logger.log('INFO', "All JAR data has been written to '" + config.dataDir + dataFileName + "'.");
    }
  });
}

function verifyInputXML(jarContent) {
  logger.log('DEBUG', "Found input XML file " + jarContent.inputFileName + " for the " + config.pkgTypes[jarContent.jarType].name + " package.");
  return new Promise(function(fulfill, reject) {
    if (! jarContent.inputFile || ! jarContent.inputFile.version) {
      logger.log('ERROR', "Parameter 'version' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else {
      // Verify input XML version matches JAR file name
      if (workingBOM.release.toLowerCase() + '-' + jarContent.inputFile.version !== jarFiles[jarContent.jarType].jarVersion) {
        logger.log('ERROR', "Parameter 'version' from input XML file does not match JAR file name for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      }

      // Gather individual version components
      var verMatch = jarContent.inputFile.version.match(/(.+)\-([0-9]+)$/);
      var jarVersion = verMatch[1];
      var jarSubversion = verMatch[2];
      var jarBootVersion = null;

      if (config.pkgTypes[jarContent.jarType].type === 'fw' && config.pkgTypes[jarContent.jarType].preVersion) {
        var verSubMatch = jarVersion.match(new RegExp('^' + config.pkgTypes[jarContent.jarType].preVersion + '(.+)$'));
        if (! verSubMatch) {
          logger.log('ERROR', "Pre-version missing in 'version' parameter from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        } else {
          jarVersion = verSubMatch[1];
        }
      }

      // Save package version and subversion
      jarData[jarContent.jarType].version = jarVersion;
      jarData[jarContent.jarType].subVersion = jarSubversion;

      // Build list of expected operating systems for this package (based on BOM)
      var bomOSList = [];
      workingBOM.osList.forEach(function(bomOS) {
        if (config.pkgTypes[jarContent.jarType].type === 'dd' && bomOS.ddName === config.pkgTypes[jarContent.jarType].os) {
          bomOSList.push(bomOS);
        } else if (config.pkgTypes[jarContent.jarType].type === 'fw' && bomOS.type === config.pkgTypes[jarContent.jarType].osType) {
          bomOSList.push(bomOS);
        }
      });
      var bomOSListUnique = {};
      bomOSList.forEach(function(bomOS) {
        bomOS.pkgsdkName.forEach(function(os) {
          if (! bomOSListUnique[os]) {
            bomOSListUnique[os] = [bomOS.arch];
          } else if (bomOSListUnique[os].indexOf(bomOS.arch) < 0) {
            bomOSListUnique[os].push(bomOS.arch);
          }
        });
      });

      // Verify category.type
      if (! jarContent.inputFile.category || ! jarContent.inputFile.category.type) {
        logger.log('ERROR', "Paramater 'category.type' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      } else {
        if (jarContent.inputFile.category.type !== workingBOM.release) {
          logger.log('ERROR', "Invalid value for 'category.type' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        }
      }

      // Verify category
      if (! jarContent.inputFile.category || ! jarContent.inputFile.category.$t) {
        logger.log('ERROR', "Paramater 'category' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
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
          logger.log('ERROR', "Invalid value for 'category' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        }
      }

      // Verify vendor
      if (! jarContent.inputFile.vendor) {
        logger.log('ERROR', "Paramater 'vendor' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      } else {
        if (! jarContent.inputFile.vendor.match(new RegExp('^' + config.vendor + '$'))) {
          logger.log('ERROR', "Invalid value for 'vendor' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        }
      }

      // Verify rebootRequired
      if (! jarContent.inputFile.rebootRequired) {
        logger.log('ERROR', "Paramater 'rebootRequired' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      } else {
        if (jarContent.inputFile.rebootRequired.toLowerCase() !== 'yes') {
          logger.log('ERROR', "Invalid value for 'rebootRequired' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        }
      }

      // Verify updateType
      if (! jarContent.inputFile.updateType) {
        logger.log('ERROR', "Paramater 'updateType' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      } else {
        if ((config.pkgTypes[jarContent.jarType].type === 'fw' && jarContent.inputFile.updateType.toLowerCase() !== 'firmware') ||
            (config.pkgTypes[jarContent.jarType].type === 'dd' && jarContent.inputFile.updateType.toLowerCase() !== 'driver')) {
          logger.log('ERROR', "Invalid value for 'updateType' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        }
      }

      // Verify updateSelection
      if (! jarContent.inputFile.updateSelection) {
        logger.log('ERROR', "Paramater 'updateSelection' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      } else {
        if (jarContent.inputFile.updateSelection.toLowerCase() !== 'auto') {
          logger.log('ERROR', "Invalid value for 'updateSelection' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        }
      }

      // Verify applicableDeviceID entries
      if (! jarContent.inputFile.applicableDeviceIdLabel) {
        logger.log('ERROR', "Paramater 'applicableDeviceIdLabel' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      } else {
        var jarDidList = jarContent.inputFile.applicableDeviceIdLabel;
        if (config.pkgTypes[jarContent.jarType].type === 'fw') {
          var bomDidList = workingBOM.appDIDList['fw'][config.pkgTypes[jarContent.jarType].os][config.pkgTypes[jarContent.jarType].asic];
        } else {
          var bomDidList = workingBOM.appDIDList['dd'][config.pkgTypes[jarContent.jarType].os][config.pkgTypes[jarContent.jarType].proto];
        }
        bomDidList.forEach(function(did) {
          if (jarDidList.indexOf(did) < 0) logger.log('ERROR', "The ApplicableDeviceID '" + did + "' is missing from the input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        });
        jarDidList.forEach(function(did) {
          if (bomDidList.indexOf(did) < 0) logger.log('ERROR', "The ApplicableDeviceID '" + did + "' is incorrectly included in the input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        });
      }

      // Verify osUpdateData
      if (! jarContent.inputFile.osUpdateData || typeof jarContent.inputFile.osUpdateData !== 'object') {
        logger.log('ERROR', "Parameter 'osUpdateData' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      } else {
        var osUpdateList = Object.keys(jarContent.inputFile.osUpdateData);
        if (! osUpdateList || osUpdateList.length > 1) {
          logger.log('ERROR', "Incorrect number of operating systems in parameter 'osUpdateData' from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        } else if (osUpdateList[0] !== config.pkgTypes[jarContent.jarType].osType) {
          logger.log('ERROR', "Incorrect OS in parameter 'osUpdateData' from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        } else if (! jarContent.inputFile.osUpdateData[osUpdateList[0]].driverFiles || typeof jarContent.inputFile.osUpdateData[osUpdateList[0]].driverFiles !== 'object') {
          logger.log('ERROR', "Missing 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        } else if (! jarContent.inputFile.osUpdateData[osUpdateList[0]].driverFiles.driverFile) {
          logger.log('ERROR', "Incorrect format of 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        } else {
          var inputDriverFile = jarContent.inputFile.osUpdateData[osUpdateList[0]].driverFiles.driverFile;
          if (! Array.isArray(inputDriverFile)) var jarDriverFileList = [inputDriverFile];
          else var jarDriverFileList = inputDriverFile;

          // Build list of expected driverFile entries for this package (based on BOM)
          if (config.pkgTypes[jarContent.jarType].type === 'fw') {
            var bomAdapterList = [];
            workingBOM.adapterList.forEach(function(adapter) {
              if (adapter.asic === config.pkgTypes[jarContent.jarType].asic) bomAdapterList.push(adapter);
            });
            var bomDriverFileEntries = {};
            bomAdapterList.forEach(function(adapter) {
              adapter.agent.forEach(function(agent) {
                if (! bomDriverFileEntries[agent.type]) {
                  bomDriverFileEntries[agent.type] = [agent.id];
                } else {
                  if (bomDriverFileEntries[agent.type].indexOf(agent.id) < 0) bomDriverFileEntries[agent.type].push(agent.id);
                }

                if (! bomDriverFileEntries[config.classMap[agent.type]]) bomDriverFileEntries[config.classMap[agent.type]] = [];
                adapter.v2.forEach(function(v2) {
                  if (bomDriverFileEntries[config.classMap[agent.type]].indexOf(v2) < 0) bomDriverFileEntries[config.classMap[agent.type]].push(v2);
                });

                // TODO: Workaround for Lenovo's broken classification types
                if (agent.type === '13') {
                  if (! bomDriverFileEntries['10']) bomDriverFileEntries['10'] = [];
                  adapter.v2.forEach(function(v2) {
                    if (bomDriverFileEntries['10'].indexOf(v2) < 0) bomDriverFileEntries['10'].push(v2);
                  });
                  if (bomDriverFileEntries['10'].indexOf(agent.id) < 0) bomDriverFileEntries['10'].push(agent.id);
                }
                // TODO: End workaround
              });
            });
          }

          if (config.pkgTypes[jarContent.jarType].type === 'dd') {
            // Handle driver package
            if (jarDriverFileList.length > 1) {
              // There are multiple driverFile entries -- Verify that they're all correct
              var uniqueEntries = {};
              jarDriverFileList.forEach(function(driverFileEntry) {
                if (! driverFileEntry.os) {
                  logger.log('ERROR', "Unspecified OS with multiple 'driverFile' sections from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  // Verify entry is not a duplicate
                  if (! uniqueEntries[driverFileEntry.os]) {
                    if (! driverFileEntry.arch) {
                      uniqueEntries[driverFileEntry.os] = [];
                    } else {
                      uniqueEntries[driverFileEntry.os] = [driverFileEntry.arch];
                    }
                  } else {
                    if (uniqueEntries[driverFileEntry.os].length === 0) {
                      logger.log('ERROR', "Duplicate OS entries in 'driverFile' sections from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else {
                      if (! driverFileEntry.arch || uniqueEntries[driverFileEntry.os].indexOf(driverFileEntry.arch) > -1) {
                        if (driverFileEntry.os !== 'Windows 2008' || jarContent.jarType !== 'ddWinNIC') {
                          // Workaround for Lenovo tools using same OS for WS2008 and WS2008R2
                          logger.log('ERROR', "Duplicate OS entries in 'driverFile' sections from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                        }
                      } else {
                        uniqueEntries[driverFileEntry.os].push(driverFileEntry.arch);
                      }
                    }
                  }

                  // Verify OS is expected
                  if (! bomOSListUnique[driverFileEntry.os]) {
                    logger.log('ERROR', "Unexpected OS (" + driverFileEntry.os + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  }

                  // Verify architecture is expected
                  if (driverFileEntry.arch) {
                    if (bomOSListUnique[driverFileEntry.os].indexOf(driverFileEntry.arch.replace('x32', 'x86')) < 0) {
                      logger.log('ERROR', "Unexpected architecture (" + driverFileEntry.arch + ") for " + driverFileEntry.os + " in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    }
                  }

                  // Verify driver file name
                  if (! driverFileEntry.name) {
                    logger.log('ERROR', "Missing driver name in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else if (config.pkgTypes[jarContent.jarType].ddFileName.indexOf(driverFileEntry.name) < 0) {
                    logger.log('ERROR', "Unexpected driver name (" + driverFileEntry.name + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  }

                  // Verify driver version
                  if (! driverFileEntry.version) {
                    logger.log('ERROR', "Missing driver version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else {
                    if (driverFileEntry.version !== config.pkgTypes[jarContent.jarType].ddVerFormat.replace('##VERSION##', jarVersion)) {
                      logger.log('ERROR', "Incorrect driver version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    }
                  }
                }
              });

              // Verify all expected operating systems and architectures are included
              for (var os in bomOSListUnique) {
                if (! uniqueEntries[os]) {
                  logger.log('ERROR', "Missing OS (" + os + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  if (uniqueEntries[os].length > 0) {
                    bomOSListUnique[os].forEach(function(arch) {
                      if (uniqueEntries[os].indexOf(arch) < 0) {
                        logger.log('ERROR', "Missing architecture (" + arch + ") for " + os + " in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      }
                    });
                  }
                }
              }

            } else {
              // There's only a single driverFile entry -- Verify that it's correct
              if (jarDriverFileList[0].os) {
                // Verify that the one listed OS is expected
                if (! bomOSListUnique[jarDriverFileList[0].os]) {
                  logger.log('ERROR', "Unexpected OS (" + jarDriverFileList[0].os + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                }

                // Verify that only one OS is expected
                if (Object.keys(bomOSListUnique).length > 1) {
                  for (var os in bomOSListUnique) {
                    if (os !== jarDriverFileList[0].os) logger.log('ERROR', "Missing OS (" + os + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  }
                }
              }

              if (jarDriverFileList[0].arch) {
                for (var os in bomOSListUnique) {
                  // Verify that the one listed architecture is expected
                  if (bomOSListUnique[os].indexOf(jarDriverFileList[0].arch) < 0) {
                    logger.log('ERROR', "Unexpected architecture (" + jarDriverFileList[0].arch + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  }

                  // Verify that only one architecture is expected
                  if (bomOSListUnique[os].length > 1) {
                    for (var arch in bomOSListUnique[os]) {
                      if (arch !== jarDriverFileList[0].arch) logger.log('ERROR', "Missing architecture (" + arch + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    }
                  }
                }
              }

              // Verify driver file name
              if (! jarDriverFileList[0].name) {
                logger.log('ERROR', "Missing driver name in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else if (config.pkgTypes[jarContent.jarType].ddFileName.indexOf(jarDriverFileList[0].name) < 0) {
                logger.log('ERROR', "Unexpected driver name (" + jarDriverFileList[0].name + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              }

              // Verify driver version
              if (! jarDriverFileList[0].version) {
                logger.log('ERROR', "Missing driver version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else {
                if (jarDriverFileList[0].version !== config.pkgTypes[jarContent.jarType].ddVerFormat.replace('##VERSION##', jarVersion)) {
                  logger.log('ERROR', "Incorrect driver version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                }
              }
            }

          } else if (config.pkgTypes[jarContent.jarType].type === 'fw') {
            // Handle firmware package
            if (jarDriverFileList.length > 1) {
              var uniqueEntries = {};
              jarDriverFileList.forEach(function(driverFileEntry) {
                // Verify name and classification are defined
                if (! driverFileEntry.classification) {
                  logger.log('ERROR', "Missing classification in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (! driverFileEntry.name) {
                  logger.log('ERROR', "Missing name in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  // Verify entry is not a duplicate
                  if (! uniqueEntries[driverFileEntry.classification]) {
                    uniqueEntries[driverFileEntry.classification] = [driverFileEntry.name];
                  } else {
                    if (uniqueEntries[driverFileEntry.classification].indexOf(driverFileEntry.name) > -1) {
                      logger.log('ERROR', "Duplicate entry (" + driverFileEntry.name + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else {
                      uniqueEntries[driverFileEntry.classification].push(driverFileEntry.name);
                    }
                  }

                  // Verify entry is expected
                  if (! bomDriverFileEntries[driverFileEntry.classification] || bomDriverFileEntries[driverFileEntry.classification].indexOf(driverFileEntry.name) < 0) {
                    logger.log('ERROR', "Unexpected entry (" + driverFileEntry.name + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  }

                  // Verify version is correct
                  if (! driverFileEntry.version) {
                    logger.log('ERROR', "Missing version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else {
                    if (driverFileEntry.classification === '32773' || driverFileEntry.classification === config.classMap['32773']) {
                      // Handle bootcode entry
                      if (! config.pkgTypes[jarContent.jarType].bootRegex) {
                        logger.log('ERROR', "Unexpected boot BIOS version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      } else {
                        if (! driverFileEntry.version.match(config.pkgTypes[jarContent.jarType].bootRegex)) {
                          logger.log('ERROR', "Incorrect boot BIOS version (" + driverFileEntry.version + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                        } else {
                          if (! jarBootVersion) {
                            jarBootVersion = driverFileEntry.version;
                            jarData[jarContent.jarType].bootVersion = jarBootVersion;
                          } else if (jarBootVersion !== driverFileEntry.version) {
                            logger.log('ERROR', "Multiple boot BIOS versions specified in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                          }
                        }
                      }
                    } else {
                      // The toUpperCase() is necessary to ensure Saturn FW is correct
                      if (driverFileEntry.version !== jarVersion.toUpperCase()) logger.log('ERROR', "Incorrect version (" + driverFileEntry.version + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    }
                  }
                }
              });

              // Verify all expected entries were found
              for (var dfClass in bomDriverFileEntries) {
                if (! uniqueEntries[dfClass]) {
                  logger.log('ERROR', "Missing entry for classification '" + dfClass + "' in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  bomDriverFileEntries[dfClass].forEach(function(entry) {
                    if (uniqueEntries[dfClass].indexOf(entry) < 0) {
                      logger.log('ERROR', "Missing entry (" + entry + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    }
                  });
                }
              }

            } else {
              // Firmware packages should always have multiple entries -- Show error
              logger.log('ERROR', "Insufficient number of entries in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
            }
          }
        }
      }

      // Verify updateTargetInformation section exists (includes applicableOperatingSystems and applicableMachineTypes)
      if (! jarContent.inputFile.updateTargetInformation) {
        logger.log('ERROR', "Section 'updateTargetInformation' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      } else {
        // Verify applicableOperatingSystems
        if (! jarContent.inputFile.updateTargetInformation.applicableOperatingSystems || ! jarContent.inputFile.updateTargetInformation.applicableOperatingSystems.os) {
          logger.log('ERROR', "Parameter 'applicableOperatingSystems' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        } else {
          var inputApplicableOS = jarContent.inputFile.updateTargetInformation.applicableOperatingSystems.os;
          if (! Array.isArray(inputApplicableOS)) var jarApplicableOSList = [inputApplicableOS];
          else var jarApplicableOSList = inputApplicableOS;

          // Verify operating systems are expected
          jarApplicableOSList.forEach(function(os) {
            if (! bomOSListUnique[os]) logger.log('ERROR', "Unexpected OS (" + os + ") in 'applicableOperatingSystems' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
          });

          // Verify all expected operating systems were found
          for (var os in bomOSListUnique) {
            if (jarApplicableOSList.indexOf(os) < 0) logger.log('ERROR', "Missing OS (" + os + ") in 'applicableOperatingSystems' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
          }
        }

        // Verify applicableMachineTypes
        if (! jarContent.inputFile.updateTargetInformation.applicableMachineTypes || ! jarContent.inputFile.updateTargetInformation.applicableMachineTypes.machineNumber) {
          logger.log('ERROR', "Parameter 'applicableMachineTypes' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        } else {
          var inputApplicableMT = jarContent.inputFile.updateTargetInformation.applicableMachineTypes.machineNumber;
          if (! Array.isArray(inputApplicableMT)) var jarApplicableMTList = [inputApplicableMT];
          else var jarApplicableMTList = inputApplicableMT;

          // Build list of expected machine types for this package
          var jarMTList = [];
          if (config.pkgTypes[jarContent.jarType].type === 'dd') {
            if (['nic', 'iscsi', 'cna'].indexOf(config.pkgTypes[jarContent.jarType].proto) > -1) {
              var jarASICTypes = ['cna'];
            } else if (config.pkgTypes[jarContent.jarType].proto === 'fc' && config.pkgTypes[jarContent.jarType].osType === 'windows') {
              var jarASICTypes = ['fc'];
            } else if (config.pkgTypes[jarContent.jarType].proto === 'fc' && config.pkgTypes[jarContent.jarType].osType === 'linux') {
              var jarASICTypes = ['cna', 'fc'];
            }
            workingBOM.adapterList.forEach(function(adapter) {
              for (var a = 0; a < config.asicTypes.length; a++) {
                if (adapter.asic === config.asicTypes[a].name && jarASICTypes.indexOf(config.asicTypes[a].type) > -1) {
                  adapter.mtm.forEach(function(mt) {
                    if (jarMTList.indexOf(mt) < 0) jarMTList.push(mt);
                  });
                  break;
                }
              }
            });
          } else if (config.pkgTypes[jarContent.jarType].type === 'fw') {
            workingBOM.adapterList.forEach(function(adapter) {
              if (adapter.asic === config.pkgTypes[jarContent.jarType].asic) {
                adapter.mtm.forEach(function(mt) {
                  if (jarMTList.indexOf(mt) < 0) jarMTList.push(mt);
                });
              }
            });
          }

          // Verify no duplicate machine types were found
          var uniqueMT = [];
          jarApplicableMTList.forEach(function(mt) {
            if (uniqueMT.indexOf(mt) > -1) {
              logger.log('ERROR', "Duplicate machine type entires (" + mt + ") in 'applicableMachineTypes' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
            } else {
              uniqueMT.push(mt);
            }
          });

          // Verify machine types are expected
          uniqueMT.forEach(function(mt) {
            if (jarMTList.indexOf(mt) < 0) logger.log('ERROR', "Unexpected machine type (" + mt + ") in 'applicableMachineTypes' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
          });

          // Verify all expected machine types were found
          jarMTList.forEach(function(mt) {
            if (uniqueMT.indexOf(mt) < 0) logger.log('ERROR', "Missing machine type (" + mt + ") in 'applicableMachineTypes' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
          });
        }
      }

      if (config.pkgTypes[jarContent.jarType].type !== 'fw') {
        // Verify driver package does *not* contain PLDM FW update data
        if (jarContent.inputFile.pldmFirmware) {
          logger.log('ERROR', "Section 'pldmFirmware' incorrectly included in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        }
      } else {
        // Verify firmware package supports PLDM FW updates
        var pkgSupportsPLDM = false;
        workingBOM.adapterList.forEach(function(adapter) {
          if (adapter.asic === config.pkgTypes[jarContent.jarType].asic && adapter.pldm.vendor) pkgSupportsPLDM = true;
        });
        if (! pkgSupportsPLDM) {
          // Verify package does *not* contain PLDM FW update data
          if (jarContent.inputFile.pldmFirmware) {
            logger.log('ERROR', "Section 'pldmFirmware' incorrectly included in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
          }
        } else {
          // Package supports PLDM FW updates -- Verify pldmFirmware section
          if (! jarContent.inputFile.pldmFirmware) {
            logger.log('ERROR', "Section 'pldmFirmware' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
          } else {
            // Verify pldmFileName
            if (! jarContent.inputFile.pldmFirmware.pldmFileName) {
              logger.log('ERROR', "Parameter 'pldmFileName' missing from 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
            } else {
              if (jarContent.inputFile.pldmFirmware.pldmFileName.indexOf(jarVersion) < 0) {
                logger.log('WARN', "Package version not found in parameter 'pldmFileName' from 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              }
            }

            // Verify deviceDescriptor entries
            if (! jarContent.inputFile.pldmFirmware.deviceDescriptor) {
              logger.log('ERROR', "Parameter 'deviceDescriptor' missing from 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
            } else {
              var inputDeviceDesc = jarContent.inputFile.pldmFirmware.deviceDescriptor;
              if (! Array.isArray(inputDeviceDesc)) var jarDeviceDescList = [inputDeviceDesc];
              else var jarDeviceDescList = inputDeviceDesc;
              var bomAdapterList = [];
              var bomDeviceCount = 0;
              workingBOM.adapterList.forEach(function(adapter) {
                if (adapter.asic === config.pkgTypes[jarContent.jarType].asic && Object.keys(adapter.pldm).length > 0) {
                  var isUnique = true;
                  adapter.agent.forEach(function(agent) {
                    var agentExists = false;
                    bomAdapterList.forEach(function(bomAdapter) {
                      bomAdapter.agent.forEach(function(bomAdapterAgent) {
                        if (agent.id === bomAdapterAgent.id && agent.type === bomAdapterAgent.type) agentExists = true;
                      });
                    });
                    if (agentExists) isUnique = false;
                  });
                  if (isUnique) {
                    bomAdapterList.push(adapter);
                    bomDeviceCount += adapter.agent.length;
                  }
                }
              });

              // Verify there are no duplicate entries
              var uniqueDevices = [];
              jarDeviceDescList.forEach(function(deviceEntry) {
                if (uniqueDevices.indexOf(deviceEntry) > -1) {
                  logger.log('ERROR', "Duplicate 'deviceDescriptor' entries in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  uniqueDevices.push(deviceEntry);
                }
              });

              // Verify the number of entries matches supported adapters in BOM
              if (uniqueDevices.length !== bomDeviceCount) {
                logger.log('ERROR', "Incorrect number of 'deviceDescriptor' entries in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              }

              uniqueDevices.forEach(function(devDescEntry) {
                // Verify vendorSpecifier, deviceSpecifier, imageId, and classification are defined
                if (! devDescEntry.vendorSpecifier) {
                  logger.log('ERROR', "Missing 'deviceDescriptor.vendorSpecifier' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (! devDescEntry.deviceSpecifier) {
                  logger.log('ERROR', "Missing 'deviceDescriptor.deviceSpecifier' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (! devDescEntry.imageId) {
                  logger.log('ERROR', "Missing 'deviceDescriptor.imageId' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (! devDescEntry.classification) {
                  logger.log('ERROR', "Missing 'deviceDescriptor.classification' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  // Verify full entry matches an expected adapter from the BOM
                  var matchingEntry = false;
                  bomAdapterList.forEach(function(adapter) {
                    if (devDescEntry.vendorSpecifier.toUpperCase() === '0X' + adapter.pldm.vendor.toUpperCase() && devDescEntry.deviceSpecifier.toUpperCase() === '0X' + adapter.pldm.device.toUpperCase()) {
                      var matchingAgent = false;
                      adapter.agent.forEach(function(agent) {
                        if (devDescEntry.imageId === '00' + agent.id && devDescEntry.classification === agent.type) matchingEntry = true;
                      });
                    }
                  });
                  if (! matchingEntry) {
                    logger.log('ERROR', "Unexpected 'deviceDescriptor' entry in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  }
                }
              });

              // Verify file entries -- Only performed if deviceDescriptor entries are found
              if (! jarContent.inputFile.pldmFirmware.file) {
                logger.log('ERROR', "Parameter 'file' missing from 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else {
                var inputPLDMFile = jarContent.inputFile.pldmFirmware.file;
                if (! Array.isArray(inputPLDMFile)) var jarFileList = [inputPLDMFile];
                else var jarFileList = inputPLDMFile;

                // Verify there are no duplicate entries
                var uniqueFiles = [];
                jarFileList.forEach(function(fileEntry) {
                  if (uniqueFiles.indexOf(fileEntry) > -1) {
                    logger.log('ERROR', "Duplicate 'file' entries in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else {
                    uniqueFiles.push(fileEntry);
                  }
                });

                // Verify the number of entries matches number of Agentless types for matching adapters in BOM
                var uniqueTypes = [];
                bomAdapterList.forEach(function(adapter) {
                  adapter.agent.forEach(function(agent) {
                    if (uniqueTypes.indexOf(agent.type) < 0) uniqueTypes.push(agent.type);
                  });
                });
                if (uniqueFiles.length !== uniqueTypes.length) {
                  logger.log('ERROR', "Incorrect number of 'file' entries in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                }

                var fileCount = 1;
                uniqueFiles.forEach(function(fileEntry) {
                  // Verify name, source, version, and offset are defined
                  if (! fileEntry.name) {
                    logger.log('ERROR', "Missing 'file.name' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else if (! fileEntry.source) {
                    logger.log('ERROR', "Missing 'file.source' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else if (! fileEntry.version) {
                    logger.log('ERROR', "Missing 'file.version' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else if (! fileEntry.offset) {
                    logger.log('ERROR', "Missing 'file.offset' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else {
                    // Verify file.name
                    if (fileEntry.name !== fileCount.toString()) {
                      logger.log('ERROR', "Unexpected value (" + fileEntry.name + ") for 'file.name' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    }
                    fileCount++;

                    // Verify file.source
                    var typeIndex = uniqueTypes.indexOf(fileEntry.source);
                    if (typeIndex < 0) {
                      logger.log('ERROR', "Invalid value (" + fileEntry.source + ") for 'file.source' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else {
                      // There should only be one entry per classification type
                      uniqueTypes.slice(typeIndex, 1);
                    }

                    // Verify file.version
                    if (fileEntry.version !== jarVersion) {
                      logger.log('ERROR', "Invalid value (" + fileEntry.version + ") for 'file.version' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    }

                    // Verify file.offset
                    if (fileEntry.offset !== '0') {
                      logger.log('ERROR', "Invalid value (" + fileEntry.offset + ") for 'file.offset' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    }
                  }
                });
              }
            }
          }
        }
      }

      // Verify description
      // Note: verification of description must be last, due to pieces of the string being pulled from above checks
      if (! jarContent.inputFile.description) {
        logger.log('ERROR', "Parameter 'description' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      } else {
        if (config.pkgTypes[jarContent.jarType].bootRegex) {
          var jarDesc = config.pkgTypes[jarContent.jarType].inputDesc.replace('##VERSION##', jarVersion + '-' + jarBootVersion).replace('##RELEASE##', workingBOM.release);
        } else {
          var jarDesc = config.pkgTypes[jarContent.jarType].inputDesc.replace('##VERSION##', jarVersion).replace('##RELEASE##', workingBOM.release);
        }
        if (jarContent.inputFile.description !== jarDesc) {
          logger.log('ERROR', "Invalid value for 'description' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        }
      }
    }
    fulfill();
  });
}

function verifyPackageXML(jarContent) {
  logger.log('DEBUG', "Found package XML file " + jarContent.xmlFileName + " for the " + config.pkgTypes[jarContent.jarType].name + " package.");
  // TODO:
  // console.log(JSON.stringify(jarContent.xmlFile, null, 2));
  return new Promise(function(fulfill, reject) {
    fulfill();
  });
}

function verifyReadmeFile(jarContent) {
  logger.log('DEBUG', "Found README file " + jarContent.readmeFileName + " for the " + config.pkgTypes[jarContent.jarType].name + " package.");
  // TODO:
  // console.log(jarContent.readmeFile);
  return new Promise(function(fulfill, reject) {
    fulfill();
  });
}

function verifyChangeFile(jarContent) {
  logger.log('DEBUG', "Found Change History file " + jarContent.changeFileName + " for the " + config.pkgTypes[jarContent.jarType].name + " package.");
  return new Promise(function(fulfill, reject) {
    // Build list of supported system types based on BOM
    var bomSystemTypeList = [];
    workingBOM.adapterList.forEach(function(adapter) {
      if (config.pkgTypes[jarContent.jarType].type === 'fw') {
        if (adapter.asic === config.pkgTypes[jarContent.jarType].asic && bomSystemTypeList.indexOf(adapter.type) < 0) bomSystemTypeList.push(adapter.type);
      } else {
        for (var i = 0; i < config.asicTypes.length; i++) {
          if (config.asicTypes[i].name === adapter.asic) {
            if (config.asicTypes[i].type === 'cna') var baseProtos = ['cna', 'iscsi', 'nic'];
            else var baseProtos = [config.asicTypes[i].type];
            if (baseProtos.indexOf(config.pkgTypes[jarContent.jarType].proto) > -1 && bomSystemTypeList.indexOf(adapter.type) < 0) bomSystemTypeList.push(adapter.type);
          }
        }
      }
    });
    // Build list of unsupported system types based on BOM
    var unsupportedTypeList = [];
    config.headerStr.systemTypes.forEach(function(sysType) {
      if (bomSystemTypeList.indexOf(sysType) < 0) unsupportedTypeList.push(sysType);
    });

    // Search file for each section to verify
    var next = 0;
    var lineCount = 0;
    var pkgDescription = null;
    var pkgVersion = null;
    var pkgBootVersion = null;
    var pkgSupportList = null;
    for (var match = jarContent.changeFile.substring(next).match(/(.*)\r?\n|\r/); match; match = jarContent.changeFile.substring(next).match(/(.*)\r?\n|\r/)) {
      lineCount++;
      if (lineCount > 10) break;
      var descRegex = new RegExp(config.pkgTypes[jarContent.jarType].changeDesc);
      var descMatch = match[0].match(descRegex);
      var verRegex = new RegExp(config.pkgTypes[jarContent.jarType].changeVer);
      var verMatch = match[0].match(verRegex);
      if (config.pkgTypes[jarContent.jarType].changeBootVer) {
        var bootVerRegex = new RegExp(config.pkgTypes[jarContent.jarType].changeBootVer);
        var bootVerMatch = match[0].match(bootVerRegex);
      }
      var suppRegex = new RegExp(config.pkgTypes[jarContent.jarType].changeSupport);
      var suppMatch = match[0].match(suppRegex);
      if (descMatch) {
        pkgDescription = match[0].replace(descRegex, config.pkgTypes[jarContent.jarType].changeDescReplace);
      } else if (verMatch) {
        pkgVersion = match[0].replace(verRegex, config.pkgTypes[jarContent.jarType].changeVerReplace);
      } else if (bootVerRegex && bootVerMatch) {
        pkgBootVersion = match[0].replace(bootVerRegex, config.pkgTypes[jarContent.jarType].changeBootVerReplace);
      } else if (suppMatch) {
        pkgSupportList = match[0].replace(suppRegex, config.pkgTypes[jarContent.jarType].changeSupportReplace);
      }
      next = next + match[0].length;
    }

    // Show error if package description is missing
    if (! pkgDescription) {
      logger.log('ERROR', "Expected package description not found in Change History file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    }
    // Show error if package version is missing or incorrect
    if (! pkgVersion) {
      logger.log('ERROR', "Package version not found in Change History file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else if (pkgVersion !== jarData[jarContent.jarType].version) {
      logger.log('ERROR', "Incorrect package version (" + pkgVersion + ") found in Change History file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    }
    // Show error if package boot code version is missing or incorrect
    if (bootVerRegex && ! pkgBootVersion) {
      logger.log('ERROR', "Boot code version not found in Change History file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else if (bootVerRegex && pkgBootVersion !== jarData[jarContent.jarType].bootVersion) {
      logger.log('ERROR', "Incorrect boot code version (" + pkgVersion + ") found in Change History file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    }
    // Show error if package support list is missing or incorrect
    if (! pkgSupportList) {
      logger.log('ERROR', "Package support list not found in Change History file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
    } else {
      bomSystemTypeList.forEach(function(systemType) {
        if (pkgSupportList.toUpperCase().search(systemType.toUpperCase()) < 0) {
          logger.log('ERROR', "Expected supported system type (" + systemType + ") not found in Change History file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        }
      });
      unsupportedTypeList.forEach(function(systemType) {
        if (pkgSupportList.toUpperCase().search(systemType.toUpperCase()) > -1) {
          logger.log('ERROR', "Unsupported system type (" + systemType + ") found in Change History file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
        }
      });
    }

    fulfill();
  });
}

function verifyPayloadFile(jarContent) {
  logger.log('DEBUG', "Found payload file " + jarContent.binFileName + " for the " + config.pkgTypes[jarContent.jarType].name + " package.");
  // Node.js unzip libraries seem to have issues with Lenovo's self-extracting archives.
  // TODO: Find a working library to make this work cross-platform or bundle unzip.exe
  return new Promise(function(fulfill, reject) {
    var payloadDir = tempPath + jarContent.jarType + '/';
    var payloadFile = payloadDir + jarContent.binFileName;
    var payloadExtract = payloadDir + 'e/';
    var payloadContentDir = payloadExtract + 'image/';
    var payloadHashFiles = [];

    if (payloadFile.match(/\.(?:tgz)|(?:tar\.gz)$/)) {
      // Payload is a tar.gz archive (Linux drivers) -- Extract it
      new Decompress().src(payloadFile).dest(payloadExtract).use(Decompress.targz()).run(function(err) {
        if(err) {
          logger.log('ERROR', "Unexpected error extracting payload file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
          fulfill();
        } else {
          // Validate content of Linux driver package payload binary
          if (config.pkgTypes[jarContent.jarType].osType !== 'linux') {
            logger.log('ERROR', "Unexpected payload binary (" + payloadFile + ") for the " + config.pkgTypes[jarContent.jarType].name + " package.");
          } else {
            // Build list of expected operating systems and architectures
            var pkgArch = [];
            var pkgOS = [];
            workingBOM.osList.forEach(function(os) {
              if (os.ddName === config.pkgTypes[jarContent.jarType].os) {
                if (pkgArch.indexOf(os.arch) < 0) pkgArch.push(os.arch);
                for (var i = 0; i < config.osMappings.length; i++) {
                  if (config.osMappings[i].ddName === os.ddName) {
                    var osKernel = config.osMappings[i].kernel[os.subVersion];
                    break;
                  }
                }
                if (os.extras !== 'kvm') {
                  pkgOS.push({
                    name: os.ddName,
                    subVersion: os.subVersion,
                    kernel: osKernel,
                    arch: os.arch,
                    extras: os.extras
                  });
                }
              }
            });

            // Validate presence of install script and verify it's not 0 bytes
            try {
              var installScriptStats = fs.statSync(payloadExtract + 'install.sh');
            } catch (err) {
              if (err.code === 'ENOENT') {
                logger.log('ERROR', "The file install.sh does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else if (err.code === 'EACCES') {
                logger.log('ERROR', "Permission denied trying to open install.sh in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else {
                logger.log('ERROR', "Unexpected error opening install.sh in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
              }
            }
            if (installScriptStats && installScriptStats.size < 1) {
              logger.log('ERROR', "The install.sh file is 0 bytes in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
            } else {
              // Save checksum of install.sh
              payloadHashFiles.push({
                file: payloadExtract + 'install.sh',
                name: 'install.sh'
              });
            }

            var ddPkgVersion = jarData[jarContent.jarType].version;

            // Validate content of driver RPM directory
            var ddKernels = [];
            var ddArches = [];
            pkgOS.forEach(function(os) {
              if (ddKernels.indexOf(os.kernel) < 0) ddKernels.push(os.kernel);
              if (ddArches.indexOf(os.arch) < 0) ddArches.push(os.arch);
            });
            if (config.pkgTypes[jarContent.jarType].os.search('rhel') > -1) {
              // Validate content of RHEL drivers
              try {
                var rpmDirFiles = fs.readdirSync(payloadExtract + config.pkgTypes[jarContent.jarType].os + '/RPMS/');
              } catch (err) {
                if (err.code === 'ENOENT') {
                  logger.log('ERROR', "The driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/RPMS/) does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (err.code === 'EACCES') {
                  logger.log('ERROR', "Permission denied trying to open driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/RPMS/) in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  logger.log('ERROR', "Unexpected error opening driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/RPMS/) in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                }
              }
              if (rpmDirFiles && rpmDirFiles.length < 1) {
                logger.log('ERROR', "No driver RPM files found in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else if (rpmDirFiles) {
                ddKernels.forEach(function(kernel) {
                  if (rpmDirFiles.indexOf(kernel) < 0) {
                    pkgOS.forEach(function(os) {
                      if (os.kernel === kernel) {
                        logger.log('ERROR', "Missing driver RPM for " + os.name.toUpperCase() + "." + os.subVersion + " " + os.arch + " in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      }
                    });
                  } else {
                    try {
                      var kernelDirFiles = fs.readdirSync(payloadExtract + config.pkgTypes[jarContent.jarType].os + '/RPMS/' + kernel + "/");
                    } catch (err) {
                      if (err.code === 'ENOENT') {
                        logger.log('ERROR', "The driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/RPMS/" + kernel + "/) does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      } else if (err.code === 'EACCES') {
                        logger.log('ERROR', "Permission denied trying to open driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/RPMS/" + kernel + "/) in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      } else {
                        logger.log('ERROR', "Unexpected error opening driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/RPMS/" + kernel + "/) in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                      }
                    }
                    if (kernelDirFiles && kernelDirFiles.length < 1) {
                      pkgOS.forEach(function(os) {
                        if (os.kernel === kernel) {
                          logger.log('ERROR', "Missing driver RPM for " + os.name.toUpperCase() + "." + os.subVersion + " " + os.arch + " in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                        }
                      });
                    } else if (kernelDirFiles) {
                      var matchingFiles = [];
                      for (var i = 0; i < pkgOS.length; i++) {
                        if (pkgOS[i].kernel === kernel) {
                          if (pkgOS[i].arch === 'x86') var osArch = 'i686';
                          if (pkgOS[i].arch === 'x64') var osArch = 'x86_64';
                          var ddFound = null;
                          kernelDirFiles.forEach(function(ddFile) {
                            if (ddFile.search(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch)) > -1) {
                              var ddVersion = ddFile.replace(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch), config.pkgTypes[jarContent.jarType].ddImageFileVersion);
                              var ddSP = ddFile.replace(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch), config.pkgTypes[jarContent.jarType].ddImageFileSP);
                              var ddArch = ddFile.replace(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch), config.pkgTypes[jarContent.jarType].ddImageFileArch);
                              if (ddVersion === ddPkgVersion && ddSP === pkgOS[i].subVersion && ddArch === osArch) ddFound = ddFile;
                            }
                          });
                          if (! ddFound) {
                            logger.log('ERROR', "Missing driver RPM for " + pkgOS[i].name.toUpperCase() + "." + pkgOS[i].subVersion + " " + pkgOS[i].arch + " in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                          } else {
                            matchingFiles.push(ddFound);
                            // Verify RPM is not 0 bytes
                            var ddFileStats = fs.statSync(payloadExtract + config.pkgTypes[jarContent.jarType].os + '/RPMS/' + kernel + "/" + ddFound);
                            if (ddFileStats.size < 1) {
                              logger.log('ERROR', "Driver RPM (" + ddFound + ") is 0 bytes in the " + config.pkgTypes[jarContent.jarType].name + " package.");
                            } else {
                              // Save checksum of driver RPM
                              payloadHashFiles.push({
                                file: payloadExtract + config.pkgTypes[jarContent.jarType].os + '/RPMS/' + kernel + '/' + ddFound,
                                name: ddFound
                              });
                            }
                          }
                        }
                      }
                      // Display error for any unexpected driver RPMs
                      kernelDirFiles.forEach(function(ddFile) {
                        if (matchingFiles.indexOf(ddFile) < 0) {
                          logger.log('ERROR', "Unexpected driver RPM (" + config.pkgTypes[jarContent.jarType].os + "/RPMS/" + kernel + "/" + ddFile + ") found in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                        }
                      });
                    }
                  }
                });
              }
            } else if (config.pkgTypes[jarContent.jarType].os.search('sles') > -1) {
              // Validate content of SLES drivers
              try {
                var rpmDirFiles = fs.readdirSync(payloadExtract + config.pkgTypes[jarContent.jarType].os + '/');
              } catch (err) {
                if (err.code === 'ENOENT') {
                  logger.log('ERROR', "The driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/) does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (err.code === 'EACCES') {
                  logger.log('ERROR', "Permission denied trying to open driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/) in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  logger.log('ERROR', "Unexpected error opening driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/) in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                }
              }
              if (rpmDirFiles && rpmDirFiles.length < 1) {
                logger.log('ERROR', "No driver RPM files found in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else if (rpmDirFiles) {
                ddArches.forEach(function(arch) {
                  if (arch === 'x86') var archDir = 'i386';
                  if (arch === 'x64') var archDir = 'x86_64';
                  if (rpmDirFiles.indexOf(archDir) < 0) {
                    pkgOS.forEach(function(os) {
                      if (os.arch === arch) {
                        logger.log('ERROR', "Missing driver RPM for " + os.name.toUpperCase() + "." + os.subVersion + " " + os.arch + " in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      }
                    });
                  } else {
                    var osVer = config.pkgTypes[jarContent.jarType].os.replace('sles', '');
                    try {
                      var archDirFiles = fs.readdirSync(payloadExtract + config.pkgTypes[jarContent.jarType].os + '/' + archDir + '/update/SUSE-SLES/' + osVer + '/rpm/');
                    } catch (err) {
                      if (err.code === 'ENOENT') {
                        logger.log('ERROR', "The driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/" + archDir + "/update/SUSE-SLES/" + osVer + "/rpm/) does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      } else if (err.code === 'EACCES') {
                        logger.log('ERROR', "Permission denied trying to open driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/" + archDir + "/update/SUSE-SLES/" + osVer + "/rpm/) in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      } else {
                        logger.log('ERROR', "Unexpected error opening driver RPM directory (" + config.pkgTypes[jarContent.jarType].os + "/" + archDir + "/update/SUSE-SLES/" + osVer + "/rpm/) in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                      }
                    }
                    if (archDirFiles && archDirFiles.length < 1) {
                      pkgOS.forEach(function(os) {
                        if (os.arch === arch) {
                          logger.log('ERROR', "Missing driver RPM for " + os.name.toUpperCase() + "." + os.subVersion + " " + os.arch + " in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                        }
                      });
                    } else if (archDirFiles) {
                      var matchingFiles = [];
                      for (var i = 0; i < pkgOS.length; i++) {
                        if (pkgOS[i].arch === arch) {
                          if (pkgOS[i].arch === 'x86') var osArch = 'i586';
                          if (pkgOS[i].arch === 'x64') var osArch = 'x86_64';
                          if (pkgOS[i].extras === 'xen') {
                            var ddFileTypes = ['kmp-xen'];
                          } else if (pkgOS[i].arch === 'x86') {
                            var ddFileTypes = ['kmp-default', 'kmp-pae'];
                          } else if (pkgOS[i].arch === 'x64') {
                            var ddFileTypes = ['kmp-default'];
                          }
                          var ddFound = [];
                          archDirFiles.forEach(function(ddFile) {
                            if (ddFile.search(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch)) > -1) {
                              var ddType = ddFile.replace(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch), config.pkgTypes[jarContent.jarType].ddImageFileType);
                              var ddVersion = ddFile.replace(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch), config.pkgTypes[jarContent.jarType].ddImageFileVersion);
                              var ddKernel = ddFile.replace(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch), config.pkgTypes[jarContent.jarType].ddImageFileKernel);
                              var ddSP = ddFile.replace(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch), config.pkgTypes[jarContent.jarType].ddImageFileSP);
                              var ddArch = ddFile.replace(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch), config.pkgTypes[jarContent.jarType].ddImageFileArch);
                              var ddTypeIndex = ddFileTypes.indexOf(ddType);
                              if (ddTypeIndex > -1 && ddVersion === ddPkgVersion && ddSP === pkgOS[i].subVersion && ddArch === osArch) {
                                ddFound.push(ddFile);
                                ddFileTypes.splice(ddTypeIndex, 1);
                              }
                            }
                          });
                          ddFileTypes.forEach(function(type) {
                            logger.log('ERROR', "Missing driver RPM type '" + type + "' for " + pkgOS[i].name.toUpperCase() + "." + pkgOS[i].subVersion + " " + pkgOS[i].arch + " in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                          });
                          ddFound.forEach(function(ddName) {
                            matchingFiles.push(ddName);
                            // Verify RPM is not 0 bytes
                            var ddFileStats = fs.statSync(payloadExtract + config.pkgTypes[jarContent.jarType].os + '/' + archDir + '/update/SUSE-SLES/' + osVer + '/rpm/' + ddName);
                            if (ddFileStats.size < 1) {
                              logger.log('ERROR', "Driver RPM (" + ddName + ") is 0 bytes in the " + config.pkgTypes[jarContent.jarType].name + " package.");
                            } else {
                              // Save checksum of driver RPM
                              payloadHashFiles.push({
                                file: payloadExtract + config.pkgTypes[jarContent.jarType].os + '/' + archDir + '/update/SUSE-SLES/' + osVer + '/rpm/' + ddName,
                                name: ddName
                              });
                            }
                          });
                        }
                      }
                      // Display error for any unexpected driver RPMs
                      archDirFiles.forEach(function(ddFile) {
                        if (matchingFiles.indexOf(ddFile) < 0) {
                          logger.log('ERROR', "Unexpected driver RPM (" + config.pkgTypes[jarContent.jarType].os + "/" + archDir + "/update/SUSE-SLES/" + osVer + "/rpm/" + ddFile + ") found in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                        }
                      });
                    }
                  }
                });
              }
            }

            // Validate content of SRPM directory
            try {
              var srpmDirFiles = fs.readdirSync(payloadExtract + config.pkgTypes[jarContent.jarType].srpmImageFileDir);
            } catch (err) {
              if (err.code === 'ENOENT') {
                logger.log('ERROR', "The SRPM directory does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else if (err.code === 'EACCES') {
                logger.log('ERROR', "Permission denied trying to open SRPM directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else {
                logger.log('ERROR', "Unexpected error opening SRPM directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
              }
            }
            if (srpmDirFiles && srpmDirFiles.length < 1) {
              logger.log('ERROR', "No files found in the SRPM directory of the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
            } else if (srpmDirFiles) {
              // Build list of expected SRPMs
              var expectedSRPM = [];
              pkgOS.forEach(function(os) {
                if (expectedSRPM.indexOf(os.subVersion) < 0) expectedSRPM.push(os.subVersion);
              });

              // Verify all expected SRPMs are present
              srpmDirFiles.forEach(function(srpmFile) {
                if (srpmFile.search(RegExp(config.pkgTypes[jarContent.jarType].srpmImageFileSearch)) < 0) {
                  logger.log('ERROR', "Unexpected file (" + srpmFile + ") found in the SRPM directory of the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  var srpmVersion = srpmFile.replace(RegExp(config.pkgTypes[jarContent.jarType].srpmImageFileSearch), config.pkgTypes[jarContent.jarType].srpmImageFileVersion);
                  var srpmSP = srpmFile.replace(RegExp(config.pkgTypes[jarContent.jarType].srpmImageFileSearch), config.pkgTypes[jarContent.jarType].srpmImageFileSP);
                  var srpmIndex = expectedSRPM.indexOf(srpmSP);

                  if (srpmIndex < 0) {
                    logger.log('ERROR', "Unexpected file (" + srpmFile + ") found in the SRPM directory of the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else if (srpmVersion !== ddPkgVersion) {
                    logger.log('ERROR', "Incorrect version for file (" + srpmFile + ") found in the SRPM directory of the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else {
                    expectedSRPM.splice(srpmIndex, 1);
                    // Verify SRPM file is not 0 bytes
                    var srpmFileStats = fs.statSync(payloadExtract + config.pkgTypes[jarContent.jarType].srpmImageFileDir + srpmFile);
                    if (srpmFileStats.size < 1) {
                      logger.log('ERROR', "SRPM file (" + srpmFile + ") is 0 bytes in the SRPM directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else {
                      // Save checksum of driver SRPM
                      payloadHashFiles.push({
                        file: payloadExtract + config.pkgTypes[jarContent.jarType].srpmImageFileDir + srpmFile,
                        name: srpmFile
                      });
                    }
                  }
                }
              });

              // Display error if all expected SRPMs are not present
              expectedSRPM.forEach(function(srpm) {
                logger.log('ERROR', "SRPM for " + config.pkgTypes[jarContent.jarType].os.toUpperCase() + "." + srpm + " missing from the SRPM directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
              });
            }

            // Validate content of disks directory
            try {
              var disksDirFiles = fs.readdirSync(payloadExtract + 'disks/');
            } catch (err) {
              if (err.code === 'ENOENT') {
                logger.log('ERROR', "The disks directory does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else if (err.code === 'EACCES') {
                logger.log('ERROR', "Permission denied trying to open disks directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else {
                logger.log('ERROR', "Unexpected error opening disks directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
              }
            }
            if (disksDirFiles && disksDirFiles.length < 1) {
              logger.log('ERROR', "No files found in the disks directory of the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
            } else if (disksDirFiles) {
              // Build list of expected DUD images
              var expectedDUD = [];
              pkgOS.forEach(function(os) {
                var osExists = false;
                for (var i = 0; i < expectedDUD.length; i++) {
                  if (expectedDUD[i].subVersion === os.subVersion && expectedDUD[i].arch === os.arch) {
                    osExists = true;
                    break;
                  }
                }
                if (! osExists) expectedDUD.push({ subVersion: os.subVersion, arch: os.arch});
              });
              expectedDUD.forEach(function(dud) {
                if (dud.arch === 'x86') dud.arch = 'i386';
                if (dud.arch === 'x64') dud.arch = 'x86_64';
              });

              // Verify the correct DUD images are present
              disksDirFiles.forEach(function(dudFile) {
                if (dudFile.search(RegExp(config.pkgTypes[jarContent.jarType].dudImageFileSearch)) < 0) {
                  logger.log('ERROR', "Unexpected file (" + dudFile + ") found in the disks directory of the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  var dudVersion = dudFile.replace(RegExp(config.pkgTypes[jarContent.jarType].dudImageFileSearch), config.pkgTypes[jarContent.jarType].dudImageFileVersion);
                  var dudSP = dudFile.replace(RegExp(config.pkgTypes[jarContent.jarType].dudImageFileSearch), config.pkgTypes[jarContent.jarType].dudImageFileSP);
                  var dudArch = dudFile.replace(RegExp(config.pkgTypes[jarContent.jarType].dudImageFileSearch), config.pkgTypes[jarContent.jarType].dudImageFileArch);
                  var matchingDUD = false;
                  for (var i = 0; i < expectedDUD.length; i++) {
                    if (expectedDUD[i].subVersion === dudSP && expectedDUD[i].arch === dudArch && ddPkgVersion === dudVersion) {
                      matchingDUD = true;
                      expectedDUD.splice(i, 1);
                      break;
                    }
                  }
                  if (! matchingDUD) {
                    logger.log('ERROR', "Unexpected file (" + dudFile + ") found in the disks directory of the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else {
                    // Verify DUD file is not 0 bytes
                    var dudFileStats = fs.statSync(payloadExtract + 'disks/' + dudFile);
                    if (dudFileStats.size < 1) {
                      logger.log('ERROR', "DUD file (" + dudFile + ") is 0 bytes in the disks directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else {
                      // Save checksum of driver DUD
                      payloadHashFiles.push({
                        file: payloadExtract + 'disks/' + dudFile,
                        name: dudFile
                      });
                    }
                  }
                }
              });

              // Display error if DUD image was expected but not found
              expectedDUD.forEach(function(dud) {
                logger.log('ERROR', "DUD image for service pack " + dud.subVersion + " and architecture '" + dud.arch + "' missing from the disks directory of the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              });
            }

            if (config.pkgTypes[jarContent.jarType].ocmImageFileSearch) {
              // Validate content of apps directory
              var ocmArch = pkgArch.slice(0);
              var ocmDirName = config.pkgTypes[jarContent.jarType].os.toLowerCase().replace(/([a-z]+)([0-9])/, '$1-$2') + '/';
              try {
                var appsDirFiles = fs.readdirSync(payloadExtract + 'apps/');
              } catch (err) {
                if (err.code === 'ENOENT') {
                  logger.log('ERROR', "The apps directory does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (err.code === 'EACCES') {
                  logger.log('ERROR', "Permission denied trying to open apps directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  logger.log('ERROR', "Unexpected error opening apps directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                }
              }
              if (appsDirFiles && appsDirFiles.length < 1) {
                logger.log('ERROR', "No files found in the apps directory of the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else if (appsDirFiles) {
                // Verify elx_install.sh is included and not 0 bytes
                if (appsDirFiles.indexOf('elx_install.sh') < 0) {
                  logger.log('ERROR', "OCM installer file (elx_install.sh) is missing from the apps directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  var installFileStats = fs.statSync(payloadExtract + 'apps/' + 'elx_install.sh');
                  if (installFileStats.size < 1) {
                    logger.log('ERROR', "OCM installer file (elx_install.sh) is 0 bytes in the apps directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else {
                    // Save checksum of elx_install.sh
                    payloadHashFiles.push({
                      file: payloadExtract + 'apps/' + 'elx_install.sh',
                      name: 'elx_install.sh'
                    });
                  }
                }

                // Verify the correct OCM binary RPMs are included
                var ocmArchAll = [];
                for (var i = 0; i < ocmArch.length; i++) {
                  if (ocmArch[i] === 'x86') {
                    var ocmDir = 'i386/' + ocmDirName;
                    ocmArchAll.push('i386');
                  } else if (ocmArch[i] === 'x64') {
                    var ocmDir = 'x86_64/' + ocmDirName;
                    ocmArchAll.push('x86_64');
                  }
                  try {
                    var ocmDirFiles = fs.readdirSync(payloadExtract + 'apps/' + ocmDir);
                  } catch (err) {
                    if (err.code === 'ENOENT') {
                      logger.log('ERROR', "The directory 'apps/" + ocmDir + "' does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else if (err.code === 'EACCES') {
                      logger.log('ERROR', "Permission denied trying to open 'apps/" + ocmDir + "' directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else {
                      logger.log('ERROR', "Unexpected error opening 'apps/" + ocmDir + "' directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                    }
                  }
                  if (ocmDirFiles) {
                    if (ocmDirFiles.length < 1) {
                      logger.log('ERROR', "No files found in 'apps/" + ocmDir + "' directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else {
                      var ocmExists = true;
                      var ocmArchFound = [];
                      config.pkgTypes[jarContent.jarType].ocmImageFileSearch.forEach(function(ocmSearch) {
                        var ocmFileExists = false;
                        ocmDirFiles.forEach(function(ocmFile) {
                          var ocmMatch = ocmFile.match(RegExp(ocmSearch));
                          if (ocmMatch !== null) {
                            var ocmFileArch = ocmFile.replace(RegExp(ocmSearch), config.pkgTypes[jarContent.jarType].ocmImageFileArch);
                            if (ocmArchFound.indexOf(ocmFileArch) < 0) ocmArchFound.push(ocmFileArch);
                            // Verify file is of the correct architecture
                            if (ocmFileArch === ocmDir.split('/')[0]) {
                              var ocmFileStats = fs.statSync(payloadExtract + 'apps/' + ocmDir + ocmFile);
                              if (ocmFileStats.size < 1) {
                                logger.log('ERROR', "OCM installer file (" + ocmDir + ocmFile + ") is 0 bytes in the apps directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                              } else {
                                ocmFileExists = true;
                                // Save checksum of OCM RPM
                                payloadHashFiles.push({
                                  file: payloadExtract + 'apps/' + ocmDir + ocmFile,
                                  name: ocmFile
                                });
                              }
                            }
                          }
                        });
                        if (! ocmFileExists) {
                          ocmExists = false;
                        }
                      });
                      if (! ocmExists) {
                        logger.log('ERROR', "One or more OCM installer files are missing from the apps directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      } else {
                        ocmArch.splice(i, 1);
                        i--;
                      }
                    }
                  }
                }
                // Display error if OCM installer was expected but not found
                ocmArch.forEach(function(arch) {
                  logger.log('ERROR', "OCM installer for architecture (" + arch + ") missing from the apps directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                });

                // Display error if OCM installer for unexpected architecture was found
                ocmArchFound.forEach(function(arch) {
                  if (ocmArchAll.indexOf(arch) < 0) {
                    logger.log('ERROR', "OCM installer found for unexpected architecture (" + arch + ") in apps directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  }
                });
              }
            }
          }

          // Verify no unexpected files are included in Linux driver package payload binary
          // TODO:

        }

        // Gather all file checksums
        var checksumPromises = payloadHashFiles.map(function(hashFile) {
          return new Promise(function(resolve, reject) {
            getFileChecksum(hashFile.file, function(checksum) {
              jarData[jarContent.jarType].binFileContent[hashFile.name] = checksum;
              resolve();
            });
          });
        });
        Promise.all(checksumPromises).then(function() {
          fulfill();
        });

      });

    } else if (payloadFile.match(/\.(?:exe)|(?:bin)$/)) {
      // Payload is a self-extracting zip archive (firmware & Windows drivers) -- Extract it
      exec('unzip \"' + payloadFile + '\" -d \"' + payloadExtract + '\"', function(err, stdout, stderr) {
        if (stderr !== null && stderr.search('extra bytes at beginning or within zipfile') < 0) {
          logger.log('ERROR', "Unexpected error extracting payload file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + stderr);
          fulfill();
        } else {
          // Build list of supported adapters based on BOM
          var bomAdapterList = [];
          workingBOM.adapterList.forEach(function(adapter) {
            if (adapter.asic === config.pkgTypes[jarContent.jarType].asic) bomAdapterList.push(adapter);
          });

          if (config.pkgTypes[jarContent.jarType].type === 'fw') {
            // Validate content of firmware package payload binary
            if (config.pkgTypes[jarContent.jarType].osType === 'windows' || config.pkgTypes[jarContent.jarType].osType === 'linux') {
              // Validate presence and content of fwmatrix.txt
              fs.readFile(payloadContentDir + 'fwmatrix.txt', 'utf8', function(err, data) {
                if (err) {
                  if (err.code === 'ENOENT') {
                    logger.log('ERROR', "The fwmatrix.txt file does not exist for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else if (err.code === 'EACCES') {
                    logger.log('ERROR', "Permission denied trying to open fwmatrix.txt for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else {
                    logger.log('ERROR', "Unexpected error opening fwmatrix.txt for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                  }
                } else {
                  // Save checksum of fwmatrix.txt
                  payloadHashFiles.push({
                    file: payloadContentDir + 'fwmatrix.txt',
                    name: 'fwmatrix.txt'
                  });

                  // Build list of expected device types based on BOM and configuration file
                  var bomDeviceNames = [];
                  bomAdapterList.forEach(function(adapter) {
                    config.asicTypes.forEach(function(asic) {
                      if (asic.name === config.pkgTypes[jarContent.jarType].asic) {
                        asic.fwMatrixNames[adapter.type].forEach(function(name) {
                          if (bomDeviceNames.indexOf(name) < 0) bomDeviceNames.push(name);
                        });
                      }
                    });
                  });

                  // Verify all fwmatrix.txt entries are expected
                  var validMatrixEntries = [];
                  var fwMatrix = data.split('\n');
                  fwMatrix.forEach(function(fwMatrixEntry, matrixIndex) {
                    if (fwMatrixEntry !== '') {
                      var fwMatrixMatch = fwMatrixEntry.match(/^(\S+)\s+(\S+)(?:\s*(\S+))?/);
                      if (fwMatrixMatch[1].substring(0,2) !== '//') {
                        var fwMatrixDevice = fwMatrixMatch[1];
                        var fwMatrixFirmware = fwMatrixMatch[2];
                        var fwMatrixBoot = fwMatrixMatch[3];

                        // Compare device type
                        if (bomDeviceNames.indexOf(fwMatrixDevice) < 0) {
                          logger.log('ERROR', "Unexpected device type (" + fwMatrixDevice + ") in fwmatrix.txt from the " + config.pkgTypes[jarContent.jarType].name + " package.");
                        } else {
                          if (validMatrixEntries.indexOf(fwMatrixDevice) > -1) {
                            logger.log('ERROR', "Duplicate device type (" + fwMatrixDevice + ") in fwmatrix.txt from the " + config.pkgTypes[jarContent.jarType].name + " package.");
                          } else {
                            validMatrixEntries.push(fwMatrixDevice);
                          }
                        }

                        // Compare firmware image name with package firmware version
                        if (! fwMatrixFirmware) {
                          logger.log('ERROR', "Invalid entry on line " + (matrixIndex + 1) + " of fwmatrix.txt from the " + config.pkgTypes[jarContent.jarType].name + " package.");
                        } else {
                          var fwMatrixVersion = fwMatrixFirmware.replace(RegExp(config.pkgTypes[jarContent.jarType].fwImageFileSearch), config.pkgTypes[jarContent.jarType].fwImageFileReplace);
                          var fwPkgVersion = jarData[jarContent.jarType].version;
                          if (! fwMatrixVersion) {
                            logger.log('ERROR', "Unexpected firmware image file (" + fwMatrixFirmware + ") in fwmatrix.txt from the " + config.pkgTypes[jarContent.jarType].name + " package.");
                          } else {
                            if (fwMatrixVersion !== fwPkgVersion) {
                              logger.log('ERROR', "Firmware image file name (" + fwMatrixFirmware + ") in fwmatrix.txt doesn't match the " + config.pkgTypes[jarContent.jarType].name + " package version.");
                            }
                          }
                        }

                        if (jarData[jarContent.jarType].bootVersion) {
                          // Package contains boot code -- Compare boot code image name to package boot code version
                          if (! fwMatrixBoot) {
                            logger.log('ERROR', "Missing boot code image on line " + (matrixIndex + 1) + " of fwmatrix.txt from the " + config.pkgTypes[jarContent.jarType].name + " package.");
                          } else {
                            var fwMatrixBootVersion = fwMatrixBoot.replace(RegExp(config.pkgTypes[jarContent.jarType].bootImageFileSearch), config.pkgTypes[jarContent.jarType].bootImageFileReplace);
                            var fwPkgBootVersion = jarData[jarContent.jarType].bootVersion;
                            if (! fwMatrixBootVersion) {
                              logger.log('ERROR', "Unexpected boot code image file (" + fwMatrixBoot + ") in fwmatrix.txt from the " + config.pkgTypes[jarContent.jarType].name + " package.");
                            } else {
                              if (fwMatrixBootVersion !== fwPkgBootVersion) {
                                logger.log('ERROR', "Boot code image file name (" + fwMatrixBoot + ") in fwmatrix.txt doesn't match the " + config.pkgTypes[jarContent.jarType].name + " package version.");
                              }
                            }
                          }
                        } else {
                          // Package should not contain boot code -- Verify that it doesn't
                          if (fwMatrixBoot) {
                            logger.log('ERROR', "Unexpected boot code image file (" + fwMatrixBoot + ") in fwmatrix.txt from the " + config.pkgTypes[jarContent.jarType].name + " package.");
                          }
                        }
                      }
                    }
                  });

                  // Verify no expected device types are missing from fwmatrix.txt
                  bomDeviceNames.forEach(function(expectedEntry) {
                    if (validMatrixEntries.indexOf(expectedEntry) < 0) {
                      logger.log('ERROR', "Expected device type (" + expectedEntry + ") missing in fwmatrix.txt from the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    }
                  });
                }
              });

              // Determine supported architectures
              var elxflashArch = [];
              workingBOM.osList.forEach(function(os) {
                if (os.type === config.pkgTypes[jarContent.jarType].osType) {
                  if (elxflashArch.indexOf(os.arch) < 0) elxflashArch.push(os.arch);
                }
              });

              // Validate presence of elxflash script and verify it's not 0 bytes
              if (config.pkgTypes[jarContent.jarType].elxflashName) {
                var flashScript = config.pkgTypes[jarContent.jarType].elxflashName;
              } else if (config.pkgTypes[jarContent.jarType].osType === 'windows') {
                var flashScript = 'elxflash.bat';
              } else if (config.pkgTypes[jarContent.jarType].osType === 'linux') {
                var flashScript = 'elxflash.sh';
              }
              try {
                var elxflashFileStats = fs.statSync(payloadContentDir + flashScript);
              } catch (err) {
                if (err.code === 'ENOENT') {
                  logger.log('ERROR', "The file " + flashScript + " does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (err.code === 'EACCES') {
                  logger.log('ERROR', "Permission denied trying to open " + flashScript + " in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  logger.log('ERROR', "Unexpected error opening " + flashScript + " in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                }
              }
              if (elxflashFileStats && elxflashFileStats.size < 1) {
                logger.log('ERROR', "The file " + flashScript + " is 0 bytes in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else {
                // Save checksum of elxflash script
                payloadHashFiles.push({
                  file: payloadContentDir + flashScript,
                  name: flashScript
                });
              }

              // Validate presence of elxflash binary files
              var flashSubDir = [];
              elxflashArch.forEach(function(arch) {
                if (arch === 'x86') {
                  if (config.pkgTypes[jarContent.jarType].osType === 'windows') {
                    var flashDir = 'win32/';
                    flashSubDir.push('');
                  }
                  if (config.pkgTypes[jarContent.jarType].osType === 'linux') {
                    var flashDir = 'i386/';
                    workingBOM.osList.forEach(function(os) {
                      if (os.type === config.pkgTypes[jarContent.jarType].osType && os.arch === 'x86') {
                        var osDirName = os.elxFlashDir ? os.elxFlashDir + '/' : os.name.toLowerCase().replace(' ', '-') + '/';
                        if (flashSubDir.indexOf(osDirName) < 0) flashSubDir.push(osDirName);
                      }
                    });
                  }
                } else if (arch === 'x64') {
                  if (config.pkgTypes[jarContent.jarType].osType === 'windows') {
                    var flashDir = 'x64/';
                    flashSubDir.push('');
                  }
                  if (config.pkgTypes[jarContent.jarType].osType === 'linux') {
                    var flashDir = 'x86_64/';
                    workingBOM.osList.forEach(function(os) {
                      if (os.type === config.pkgTypes[jarContent.jarType].osType && os.arch === 'x64') {
                        var osDirName = os.elxFlashDir ? os.elxFlashDir + '/' : os.name.toLowerCase().replace(' ', '-') + '/';
                        if (flashSubDir.indexOf(osDirName) < 0) flashSubDir.push(osDirName);
                      }
                    });
                  }
                }

                flashSubDir.forEach(function(subDir) {
                  try {
                    var flashDirFiles = fs.readdirSync(payloadContentDir + flashDir + subDir);
                  } catch (err) {
                    if (err.code === 'ENOENT') {
                      logger.log('ERROR', "The directory '" + flashDir + subDir + "' does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else if (err.code === 'EACCES') {
                      logger.log('ERROR', "Permission denied trying to open '" + flashDir + subDir + "' directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else {
                      logger.log('ERROR', "Unexpected error opening '" + flashDir + subDir + "' directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                    }
                  }
                  if (flashDirFiles) {
                    if (flashDirFiles.length < 1) {
                      logger.log('ERROR', "No files found in '" + flashDir + subDir + "' directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else {
                      flashDirFiles.forEach(function(flashFile) {
                        try {
                          var elxflashBinFileStats = fs.statSync(payloadContentDir + flashDir + subDir + flashFile);
                        } catch (err) {
                          logger.log('ERROR', "Unexpected error opening '" + flashDir + subDir + flashFile + "' in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                        }
                        if (elxflashBinFileStats && elxflashBinFileStats.size < 1) {
                          logger.log('ERROR', "The file '" + flashDir + subDir + flashFile + "' is 0 bytes in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                        } else {
                          // Save checksum of elxflash binary file
                          payloadHashFiles.push({
                            file: payloadContentDir + flashDir + subDir + flashFile,
                            name: flashDir + subDir + flashFile
                          });
                        }
                      });
                    }
                  }
                });
              });

              // Validate presence of Update script and verify it's not 0 bytes
              if (config.pkgTypes[jarContent.jarType].osType === 'windows') var updateScript = 'Update.cmd';
              if (config.pkgTypes[jarContent.jarType].osType === 'linux') var updateScript = 'Update.sh';
              try {
                var updateScriptStats = fs.statSync(payloadContentDir + updateScript);
              } catch (err) {
                if (err.code === 'ENOENT') {
                  logger.log('ERROR', "The file " + updateScript + " does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (err.code === 'EACCES') {
                  logger.log('ERROR', "Permission denied trying to open " + updateScript + " in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  logger.log('ERROR', "Unexpected error opening " + updateScript + " in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                }
              }
              if (updateScriptStats && updateScriptStats.size < 1) {
                logger.log('ERROR', "The " + updateScript + " file is 0 bytes in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else {
                // Save checksum of Update script
                payloadHashFiles.push({
                  file: payloadContentDir + updateScript,
                  name: updateScript
                });
              }

              if (config.pkgTypes[jarContent.jarType].osType === 'linux') {
                // Validate device IDs inside Update script for xClarity workaround
                try {
                  var updateScriptContent = fs.readFileSync(payloadContentDir + updateScript, 'utf8');
                } catch (err) {
                  logger.log('ERROR', "Unexpected error opening " + updateScript + " in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                }

                if (updateScriptContent) {
                  for (var i = 0; i < config.asicTypes.length; i++) {
                    if (config.asicTypes[i].name === config.pkgTypes[jarContent.jarType].asic) {
                      var workaroundName = config.asicTypes[i].workaroundName;
                      break;
                    }
                  }
                  var expectedDids = [];
                  workingBOM.adapterList.forEach(function(adapter) {
                    if (adapter.asic === config.pkgTypes[jarContent.jarType].asic) {
                      adapter.agent.forEach(function(agent) {
                        var did = agent.id.replace('10DF','').replace('19A2','');
                        if (expectedDids.indexOf(did) < 0) expectedDids.push(did);
                      });
                    }
                  });
                  var workaroundRegex = /firmware\/(.+?)\*[\s\S]+?emulex_DID="(.+)"[\s\S]+?/;
                  for (var match = updateScriptContent.match(workaroundRegex); match; match = updateScriptContent.match(workaroundRegex)) {
                    var asicName = match[1];
                    var didList = match[2].split('_');
                    if (asicName === workaroundName) {
                      expectedDids.forEach(function(did) {
                        if (didList.indexOf(did) < 0) logger.log('ERROR', "Expected device ID (" + did + ") missing from the xClarity workaround in " + updateScript + " for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      });
                      didList.forEach(function(did) {
                        if (expectedDids.indexOf(did) < 0) logger.log('ERROR', "Unexpected device ID (" + did + ") found in the xClarity workaround in " + updateScript + " for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      });
                    }
                    updateScriptContent = updateScriptContent.substring(match.index + match[0].length);
                  }
                }
              }
            }

            // Validate presence and content of payload.xml
            var payloadXmlFileStream = fs.createReadStream(payloadContentDir + 'payload.xml');
            payloadXmlFileStream.on('error', function(err) {
              if (err.code === 'ENOENT') {
                logger.log('ERROR', "The payload.xml file does not exist for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else if (err.code === 'EACCES') {
                logger.log('ERROR', "Permission denied trying to open payload.xml for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else {
                logger.log('ERROR', "Unexpected error opening payload.xml for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
              }
            });
            var payloadXmlFile = [];
            var parser = new xml2object(['payload'], payloadXmlFileStream);
            parser.on('object', function(name, obj) { payloadXmlFile.push(obj); });
            parser.on('end', function() {
              // Save checksum of payload.xml
              payloadHashFiles.push({
                file: payloadContentDir + 'payload.xml',
                name: 'payload.xml'
              });

              // Validate payload.xml against BOM and package version
              payloadXmlFile.forEach(function(payload) {
                // Validate that the firmware image file name matches the package version (FixID)
                var fwImageType = payload.$t.match(/\/([^\/]+)\/([^\/]+)$/)[1];
                var fwImageName = payload.$t.match(/\/([^\/]+)\/([^\/]+)$/)[2];
                if (fwImageType === 'firmware') {
                  if (config.pkgTypes[jarContent.jarType].fwImageFileSearch) {
                    var fwImageVersion = fwImageName.replace(RegExp(config.pkgTypes[jarContent.jarType].fwImageFileSearch), config.pkgTypes[jarContent.jarType].fwImageFileReplace);
                    var fwPkgVersion = jarData[jarContent.jarType].version;
                  }
                } else if (fwImageType === 'boot') {
                  if (config.pkgTypes[jarContent.jarType].bootImageFileSearch) {
                    var fwImageVersion = fwImageName.replace(RegExp(config.pkgTypes[jarContent.jarType].bootImageFileSearch), config.pkgTypes[jarContent.jarType].bootImageFileReplace);
                    var fwPkgVersion = jarData[jarContent.jarType].bootVersion;
                  }
                }
                if (! fwImageVersion) {
                  logger.log('ERROR', "Unexpected firmware image file (" + fwImageName + ") in payload.xml from the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  if (fwImageVersion !== fwPkgVersion) {
                    logger.log('ERROR', "Firmware image file name (" + fwImageName + ") in payload.xml doesn't match the " + config.pkgTypes[jarContent.jarType].name + " package version.");
                  }
                }

                // Build list of expected device IDs based on BOM
                var bomV2Entries = [];
                bomAdapterList.forEach(function(adapter) {
                  adapter.v2.forEach(function(v2) {
                    if (fwImageType === 'firmware') {
                      if (config.pkgTypes[jarContent.jarType].fwImageFileNames && config.pkgTypes[jarContent.jarType].fwImageFileNames[adapter.type]) {
                        var fwNameString = fwImageName.match(config.pkgTypes[jarContent.jarType].fwImageFileSearch)[1];
                        if (fwNameString === config.pkgTypes[jarContent.jarType].fwImageFileNames[adapter.type]) {
                          if (bomV2Entries.indexOf(v2) < 0) bomV2Entries.push(v2);
                        }
                      } else {
                        if (bomV2Entries.indexOf(v2) < 0) bomV2Entries.push(v2);
                      }
                    } else if (fwImageType === 'boot') {
                      if (bomV2Entries.indexOf(v2) < 0) bomV2Entries.push(v2);
                    }
                  });
                });

                // Verify all payload.xml device IDs are expected
                var validPayloadEntries = [];
                payload.applicability.forEach(function(appDID) {
                  var payloadEntry = appDID.$t;
                  if (bomV2Entries.indexOf(payloadEntry) < 0) {
                    logger.log('ERROR', "Unexpected " + fwImageType + " device (" + payloadEntry + ") in payload.xml from the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else {
                    validPayloadEntries.push(payloadEntry);
                  }
                });

                // Verify no expected device IDs are missing from payload.xml
                bomV2Entries.forEach(function(appDID) {
                  if (validPayloadEntries.indexOf(appDID) < 0) {
                    logger.log('ERROR', "Missing " + fwImageType + " device (" + appDID + ") in payload.xml from the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  }
                });
              });
            });
            parser.start();

            // Validate firmware/* images are present and of the correct version(s)
            try {
              var fwDirFiles = fs.readdirSync(payloadContentDir + 'firmware/');
            } catch (err) {
              if (err.code === 'ENOENT') {
                logger.log('ERROR', "The firmware directory does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else if (err.code === 'EACCES') {
                logger.log('ERROR', "Permission denied trying to open firmware directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else {
                logger.log('ERROR', "Unexpected error opening firmware directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
              }
            }
            if (fwDirFiles && fwDirFiles.length < 1) {
              logger.log('ERROR', "No firmware files found in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
            } else if (fwDirFiles) {
              var fwPkgVersion = jarData[jarContent.jarType].version;
              var bomAdapterTypes = [];
              if (config.pkgTypes[jarContent.jarType].fwImageFileNames) {
                bomAdapterList.forEach(function(adapter) {
                  if (bomAdapterTypes.indexOf(adapter.type) < 0) bomAdapterTypes.push(adapter.type);
                });
              } else {
                bomAdapterTypes.push('any');
              }
              fwDirFiles.forEach(function(fwFile) {
                var fwFileVersion = fwFile.replace(RegExp(config.pkgTypes[jarContent.jarType].fwImageFileSearch), config.pkgTypes[jarContent.jarType].fwImageFileReplace);
                if (fwFileVersion !== fwPkgVersion) {
                  logger.log('ERROR', "Firmware image file name (" + fwFile + ") in firmware directory doesn't match the " + config.pkgTypes[jarContent.jarType].name + " package version.");
                } else {
                  var adapterTypeFound = false;
                  for (var i=0; i < bomAdapterTypes.length; i++) {
                    if (config.pkgTypes[jarContent.jarType].fwImageFileNames) {
                      if (fwFile.substring(0,2) === config.pkgTypes[jarContent.jarType].fwImageFileNames[bomAdapterTypes[i]]) {
                        adapterTypeFound = true;
                        bomAdapterTypes.splice(i,1);
                        i--;
                      }
                    } else {
                      adapterTypeFound = true;
                      bomAdapterTypes.splice(i,1);
                    }
                  }
                  if (! adapterTypeFound) {
                    logger.log('ERROR', "Unexpected firmware image file (" + fwFile + ") in firmware directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else {
                    // Verify image file isn't 0 bytes
                    var fwFileStats = fs.statSync(payloadContentDir + 'firmware/' + fwFile);
                    if (fwFileStats.size < 1) {
                      logger.log('ERROR', "Firmware image file (" + fwFile + ") is 0 bytes in firmware directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else {
                      // Save checksum of firmware file
                      payloadHashFiles.push({
                        file: payloadContentDir + 'firmware/' + fwFile,
                        name: 'firmware/' + fwFile
                      });
                    }
                  }
                }
              });
              if (bomAdapterTypes.length > 0) {
                bomAdapterTypes.forEach(function(adapterType) {
                  logger.log('ERROR', "Missing firmware image file type (" + adapterType + ") in firmware directory for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                });
              }
            }

            if (jarData[jarContent.jarType].bootVersion) {
              // Validate boot/* images are present and of the correct version(s)
              try {
                var bootDirFiles = fs.readdirSync(payloadContentDir + 'boot/');
              } catch (err) {
                if (err.code === 'ENOENT') {
                  logger.log('ERROR', "The boot directory does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (err.code === 'EACCES') {
                  logger.log('ERROR', "Permission denied trying to open boot directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  logger.log('ERROR', "Unexpected error opening boot directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                }
              }
              if (bootDirFiles && bootDirFiles.length < 1) {
                logger.log('ERROR', "No boot code files found in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else if (bootDirFiles) {
                var fwPkgBootVersion = jarData[jarContent.jarType].bootVersion;
                var bomAdapterTypes = [];
                if (config.pkgTypes[jarContent.jarType].bootImageNames) {
                  bomAdapterList.forEach(function(adapter) {
                    if (bomAdapterTypes.indexOf(adapter.type) < 0) bomAdapterTypes.push(adapter.type);
                  });
                } else {
                  bomAdapterTypes.push('any');
                }
                bootDirFiles.forEach(function(bootFile) {
                  var bootFileVersion = bootFile.replace(RegExp(config.pkgTypes[jarContent.jarType].bootImageFileSearch), config.pkgTypes[jarContent.jarType].bootImageFileReplace);
                  if (bootFileVersion !== fwPkgBootVersion) {
                    logger.log('ERROR', "Boot code image file name (" + bootFile + ") in boot directory doesn't match the " + config.pkgTypes[jarContent.jarType].name + " package version.");
                  } else {
                    var adapterTypeFound = false;
                    for (var i=0; i < bomAdapterTypes.length; i++) {
                      if (config.pkgTypes[jarContent.jarType].bootImageNames) {
                        if (bootFile.substring(0,2) === config.pkgTypes[jarContent.jarType].bootImageNames[bomAdapterTypes[i]]) {
                          adapterTypeFound = true;
                          bomAdapterTypes.splice(i,1);
                          i--;
                        }
                      } else {
                        adapterTypeFound = true;
                        bomAdapterTypes.splice(i,1);
                      }
                    }
                    if (! adapterTypeFound) {
                      logger.log('ERROR', "Unexpected boot code image file (" + bootFile + ") in boot directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                    } else {
                      // Verify image file isn't 0 bytes
                      var bootFileStats = fs.statSync(payloadContentDir + 'boot/' + bootFile);
                      if (bootFileStats.size < 1) {
                        logger.log('ERROR', "Boot code image file (" + bootFile + ") is 0 bytes in boot directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      } else {
                        // Save checksum of boot code file
                        payloadHashFiles.push({
                          file: payloadContentDir + 'boot/' + bootFile,
                          name: 'boot/' + bootFile
                        });
                      }
                    }
                  }
                });
                if (bomAdapterTypes.length > 0) {
                  bomAdapterTypes.forEach(function(adapterType) {
                    logger.log('ERROR', "Missing boot code image file type (" + adapterType + ") in boot directory for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  });
                }
              }
            }

            // Verify no unexpected files are included in firmware package payload binary
            // TODO:

          } else {
            // Validate content of Windows driver package payload binary
            if (config.pkgTypes[jarContent.jarType].osType !== 'windows') {
              logger.log('ERROR', "Unexpected payload binary (" + payloadFile + ") for the " + config.pkgTypes[jarContent.jarType].name + " package.");
            } else {
              // Validate presence of install script and verify it's not 0 bytes
              try {
                var installScriptStats = fs.statSync(payloadContentDir + 'Install.cmd');
              } catch (err) {
                if (err.code === 'ENOENT') {
                  logger.log('ERROR', "The file Install.cmd does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (err.code === 'EACCES') {
                  logger.log('ERROR', "Permission denied trying to open Install.cmd in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  logger.log('ERROR', "Unexpected error opening Install.cmd in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                }
              }
              if (installScriptStats && installScriptStats.size < 1) {
                logger.log('ERROR', "The Install.cmd file is 0 bytes in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else {
                // Save checksum of Install.cmd
                payloadHashFiles.push({
                  file: payloadContentDir + 'Install.cmd',
                  name: 'Install.cmd'
                });
              }

              // Validate content of Installer directory
              try {
                var installDirFiles = fs.readdirSync(payloadContentDir + 'Installer/');
              } catch (err) {
                if (err.code === 'ENOENT') {
                  logger.log('ERROR', "The Installer directory does not exist in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else if (err.code === 'EACCES') {
                  logger.log('ERROR', "Permission denied trying to open Installer directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                } else {
                  logger.log('ERROR', "Unexpected error opening Installer directory in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                }
              }
              if (installDirFiles && installDirFiles.length < 1) {
                logger.log('ERROR', "No installer files found in the payload binary for the " + config.pkgTypes[jarContent.jarType].name + " package.");
              } else if (installDirFiles) {
                // Build list of expected OCM architectures
                var ocmArch = [];
                if (config.pkgTypes[jarContent.jarType].ocmImageFileSearch) {
                  workingBOM.osList.forEach(function(os) {
                    if (os.type === config.pkgTypes[jarContent.jarType].osType) {
                      if (ocmArch.indexOf(os.arch) < 0) ocmArch.push(os.arch);
                    }
                  });
                }

                var ddPkgVersion = jarData[jarContent.jarType].version;
                var ddFound = false;
                installDirFiles.forEach(function(installFile) {
                  if (installFile.match(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch))) {
                    // Driver installer is present - Validate version and size
                    ddFound = true;
                    var ddFileVersion = installFile.replace(RegExp(config.pkgTypes[jarContent.jarType].ddImageFileSearch), config.pkgTypes[jarContent.jarType].ddImageFileReplace);
                    if (ddFileVersion && ddFileVersion !== ddPkgVersion) {
                      logger.log('ERROR', "Driver installer file name (" + installFile + ") in Installer directory doesn't match the " + config.pkgTypes[jarContent.jarType].name + " package version.");
                    } else {
                      var ddFileStats = fs.statSync(payloadContentDir + 'Installer/' + installFile);
                      if (ddFileStats.size < 1) {
                        logger.log('ERROR', "Driver installer file (" + installFile + ") is 0 bytes in Installer directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      } else {
                        // Save checksum of driver installer
                        payloadHashFiles.push({
                          file: payloadContentDir + 'Installer/' + installFile,
                          name: installFile
                        });
                      }
                    }

                  }

                  if (config.pkgTypes[jarContent.jarType].ocmImageFileSearch) {
                    var installMatch = installFile.match(RegExp(config.pkgTypes[jarContent.jarType].ocmImageFileSearch));
                    if (installMatch !== null) {
                      // OCM installer is present - Validate architecture and size
                      var installArch = installMatch[1];
                      var archIndex = ocmArch.indexOf(installArch);
                      if (archIndex < 0) {
                        logger.log('ERROR', "OCM installer found for unexpected architecture (" + installArch + ") in Installer directory of the " + config.pkgTypes[jarContent.jarType].name + " package version.");
                      } else {
                        ocmArch.splice(archIndex, 1);
                        var ocmFileStats = fs.statSync(payloadContentDir + 'Installer/' + installFile);
                        if (ocmFileStats.size < 1) {
                          logger.log('ERROR', "OCM installer file (" + installFile + ") is 0 bytes in Installer directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                        } else {
                          // Save checksum of OCM installer
                          payloadHashFiles.push({
                            file: payloadContentDir + 'Installer/' + installFile,
                            name: installFile
                          });
                        }
                      }
                    }
                  }
                });

                // Display error if driver installer was not found
                if (! ddFound) {
                  logger.log('ERROR', "Driver installer file missing from Installer directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                }

                // Display error if OCM installer was expected but not found
                ocmArch.forEach(function(arch) {
                  logger.log('ERROR', "OCM installer for architecture (" + arch + ") missing from Installer directory of the " + config.pkgTypes[jarContent.jarType].name + " package.");
                });
              }
            }

            // Verify no unexpected files are included in Windows driver package payload binary
            // TODO:

          }
        }

        // Gather all file checksums
        var checksumPromises = payloadHashFiles.map(function(hashFile) {
          return new Promise(function(resolve, reject) {
            getFileChecksum(hashFile.file, function(checksum) {
              jarData[jarContent.jarType].binFileContent[hashFile.name] = checksum;
              resolve();
            });
          });
        });
        Promise.all(checksumPromises).then(function() {
          if (config.pkgTypes[jarContent.jarType].type !== 'fw') {
            fulfill();
          } else {
            // Build list of expected PLDM firmware entries (if supported by package)
            var pldmList = [];
            workingBOM.adapterList.forEach(function(adapter) {
              if (adapter.asic === config.pkgTypes[jarContent.jarType].asic && Object.keys(adapter.pldm).length > 0) {
                // Adapter supports PLDM firmware download
                adapter.agent.forEach(function(agent) {
                  var pldmEntry = {
                    'class': agent.type,
                    'id': '00' + agent.id,
                    'device': '0x' + adapter.pldm.device,
                    'vendor': '0x' + adapter.pldm.vendor
                  };
                  var entryExists = false;
                  for (var i = 0; i < pldmList.length; i++) {
                    if (pldmList[i].class === pldmEntry.class && pldmList[i].id === pldmEntry.id && pldmList[i].device === pldmEntry.device && pldmList[i].vendor === pldmEntry.vendor) {
                      entryExists = true;
                      break;
                    }
                  }
                  if (! entryExists) pldmList.push(pldmEntry);
                });
              }
            });

            if (pldmList.length > 0) {
              // Package supports PLDM firmware download - extract data from payload
              fs.readFile(payloadFile, function(err, data) {
                if (err) {
                  logger.log('ERROR', "Unexpected error reading PLDM data from payload file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n" + err);
                } else {
                  // Find start of PLDM data within payload file
                  var tarStart = data.indexOf('pldm.xml');
                  if (tarStart < 0) {
                    logger.log('ERROR', "Unable to find start of PLDM binary section of payload file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                  } else {
                    // Extract PLDM XML data
                    var xmlStart = tarStart + 512;
                    var xmlSize = parseInt(data.slice(tarStart + 124, tarStart + 136), 8);
                    var xmlEnd = xmlStart + xmlSize;
                    var xmlBlocks = Math.ceil(xmlSize / 512);
                    var xmlRawData = data.slice(xmlStart, xmlEnd).toString();

                    // Extract PLDM firmware image
                    var binHeader = xmlStart + xmlBlocks * 512;
                    var binStart = binHeader + 512;
                    var binSize = parseInt(data.slice(binHeader + 124, binHeader + 136), 8);
                    var binEnd  = binStart + binSize;
                    var binRawData = data.slice(binStart, binEnd);

                    // Create stream from XML data for use with xml2object
                    var xmlStream = new stream.Readable();
                    xmlStream._read = function noop() {};
                    xmlStream.push(xmlRawData);
                    xmlStream.push(null);

                    // Verify XML data matches actual firmware image
                    var parser = new xml2object([ 'IBMBladeCenterFWUpdFmt' ], xmlStream);
                    parser.on('object', function(name, obj) {
                      var xmlData = obj;
                      // Verify firmware image size matches size in XML file
                      if (! xmlData.image || ! xmlData.image.size) {
                        logger.log('ERROR', "Unable to find firmware image size in PLDM XML data for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      } else {
                        var fwSize = parseInt(xmlData.image.size);
                        if (fwSize !== binSize) logger.log('ERROR', "Actual firmware image size does not match size specified in PLDM XML data for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      }

                      // Verify version in XML matches package version
                      if (xmlData.image.file.version !== fwPkgVersion) {
                        logger.log('ERROR', "Firmware version in PLDM XML data does not match the expected version for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      }

                      // Verify firmware image checksum matches checksum from image in payload
                      var pldmImageChecksum = crypto.createHash('md5').update(binRawData).digest("hex");
                      var binFileContentKeys = Object.keys(jarData[jarContent.jarType].binFileContent);
                      for (var i = 0; i < binFileContentKeys.length; i++) {
                        if (binFileContentKeys[i].search('firmware/') > -1) {
                          var payloadImageChecksum = jarData[jarContent.jarType].binFileContent[binFileContentKeys[i]];
                          break;
                        }
                      }
                      if (pldmImageChecksum !== payloadImageChecksum) {
                        logger.log('ERROR', "Checksum of firmware image in PLDM data does not match the firmware image included in the payload file for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      }

                      // Verify all expected device IDs are included in XML
                      pldmList.forEach(function(listDevice) {
                        var foundDevice = false;
                        for (var i = 0; i < xmlData.image.device_descriptor.length; i++) {
                          if (xmlData.image.device_descriptor[i].classification === listDevice.class && xmlData.image.device_descriptor[i].image_id === listDevice.id && xmlData.image.device_descriptor[i].device_specifier === listDevice.device && xmlData.image.device_descriptor[i].vendor_specifier === listDevice.vendor) {
                            foundDevice = true;
                            break;
                          }
                        }
                        if (! foundDevice) logger.log('ERROR', "Expected device descriptor (" + listDevice.id + " " + listDevice.device + " " + listDevice.vendor + ") missing from PLDM XML data for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      });

                      // Verify all device IDs in XML were expected
                      xmlData.image.device_descriptor.forEach(function(xmlDevice) {
                        var expectedDevice = false;
                        for (var i = 0; i < pldmList.length; i++) {
                          if (pldmList[i].class === xmlDevice.classification && pldmList[i].id === xmlDevice.image_id && pldmList[i].device === xmlDevice.device_specifier && pldmList[i].vendor === xmlDevice.vendor_specifier) {
                            expectedDevice = true;
                            break;
                          }
                        }
                        if (! expectedDevice) logger.log('ERROR', "Unexpected device descriptor (" + xmlDevice.image_id + " " + xmlDevice.device_specifier + " " + xmlDevice.vendor_specifier + ") in PLDM XML data for the " + config.pkgTypes[jarContent.jarType].name + " package.");
                      });
                    });
                    parser.on('end', function() {
                        fulfill();
                    });
                    parser.start();
                  }
                }
              });
            } else {
              fulfill();
            }
          }
        });

      });
    } else {
      logger.log('ERROR', "Unexpected payload file name extension for the " + config.pkgTypes[jarContent.jarType].name + " package.");
      fulfill();
    }
  });
}

/**************************************************************/
/* Start Program                                              */
/**************************************************************/

// Read configuration file
try {
  var config = require('../config.js');
} catch (err) {
  logger.log('ERROR', "Unable to open configuration file.\n" + err);
  return;
}

// Initialization
var curDate = new Date();
var startTime = '' + curDate.getFullYear() + String('00' + (curDate.getUTCMonth() + 1)).slice(-2) + String('00' + curDate.getDate()).slice(-2) + String('00' + curDate.getHours()).slice(-2) + String('00' + curDate.getMinutes()).slice(-2) + String('00' + curDate.getSeconds()).slice(-2);
if (config.dataDir[config.dataDir.length - 1] !== '/') config.dataDir += '/';
if (config.tempDir[config.tempDir.length - 1] !== '/') config.tempDir += '/';
if (config.jarDir[config.jarDir.length - 1] !== '/') config.jarDir += '/';
var tempPath = config.tempDir + 'jar-verify-' + startTime + '/';

// Parse command-line parameters
var helpText = "Usage: node jar-verify.js <parameters> \n" +
  "\nAvailable Parameters:\n" +
  " -b | --build    - (Required) Specifies the build number to verify.\n" +
  " -r | --release  - (Required) Specifies the release name to verify.\n" +
  " -s | --save     - Save the specified release/build as a delivered build.\n" +
  " -u | --unsave   - Unsave (remove) the specified release/build as a delivered build.\n" +
  " -j | --jardir   - Specify directory where JAR files can be found.\n" +
  " -d | --debug    - Display and log additional debug messages.\n";

var runParams = getParams();
var paramNames = Object.getOwnPropertyNames(runParams);

// Display help if no parameters or help parameters specified
if (paramNames.length < 1 || paramNames.indexOf('h') > -1 || paramNames.indexOf('help') > -1 || paramNames.indexOf('?') > -1) {
  console.log(helpText);
  return;
}

// Enable debug logging if specified
if (paramNames.indexOf('d') > -1 || paramNames.indexOf('debug') > -1) logger.logLevel = 'DEBUG';

// Set JAR directory if specified
if (runParams['j'] || runParams['jardir']) {
  if (runParams['j']) config.jarDir = runParams['j'];
  if (runParams['jardir']) config.jarDir = runParams['jardir'];
}

// Verify specified build number is valid
if (runParams['b'] || runParams['build']) {
  if (runParams['b'] && runParams['b'].search(/^[0-9]+(?:[0-9\.]+)?$/) > -1) {
    var workingBuild = runParams['b'];
  } else if (runParams['build'] && runParams['build'].search(/^[0-9]+(?:[0-9\.]+)?$/) > -1) {
    var workingBuild = runParams['build'];
  } else {
    logger.log('ERROR', "Specified build number is invalid.");
    return;
  }
}

// Verify specified release name is valid
if (runParams['r'] || runParams['release']) {
  if (runParams['r'] && runParams['r'].search(/^[0-9A-Za-z]+$/) > -1) {
    var workingRelease = runParams['r'].toUpperCase();
  } else if (runParams['release'] && runParams['release'].search(/^[0-9A-Za-z]+$/) > -1) {
    var workingRelease = runParams['release'].toUpperCase();
  } else {
    logger.log('ERROR', "Specified release name is invalid.");
    return;
  }
}

// Check if --save was specified
if (paramNames.indexOf('s') > -1 || paramNames.indexOf('save') > -1) {
  var saveBuildInfo = true;
} else {
  var saveBuildInfo = false;
}

// Read saved data from previous verification attempts
var dataFileName = workingRelease + '-releases.json';
try {
  var savedData = JSON.parse(fs.readFileSync(config.dataDir + dataFileName));
} catch (err) {
  if (err.code === 'ENOENT') {
    var savedData = {};
  } else {
    logger.log('ERROR', "Unexpected error reading saved data file.\n" + err);
    return;
  }
}

// If --unsave was specified, remove entry and exit
if (paramNames.indexOf('u') > -1 || paramNames.indexOf('unsave') > -1) {
  if (Object.keys(savedData).indexOf(workingBuild) > -1) {
    delete savedData[workingBuild];
    logger.log('INFO', "Build " + workingBuild + " removed from saved data.");
    putSavedData();
    return;
  } else {
    logger.log('ERROR', "Build " + workingBuild + " not found in saved data.");
    return;
  }
}

// Set jarDir to correct location based on release name and build number
if (! workingBuild || ! workingRelease) {
  logger.log('ERROR', "Release name and build number must be specified.\n" + helpText);
  return;
}
var jarDir = config.jarDir + workingRelease + '/' + workingBuild + '/';

// Read BOM file for specified release
try {
  var workingBOM = JSON.parse(fs.readFileSync(config.dataDir + workingRelease + '-BOM.json'));
} catch (err) {
  if (err.code === 'ENOENT') {
    logger.log('ERROR', "The BOM file (" + config.dataDir + workingRelease + "-BOM.json) does not exist.");
  } else if (err.code === 'EACCES') {
    logger.log('ERROR', "Permission denied trying to open BOM file.");
  } else {
    logger.log('ERROR', "Unexpected error reading BOM file.\n" + err);
  }
  return;
}

logger.log('INFO', "Building list of JAR files for the specified release and build...");

// Gather list of JAR files in jarDir
try {
  var jarDirFiles = fs.readdirSync(jarDir);
} catch (err) {
  if (err.code === 'ENOENT') {
    logger.log('ERROR', "The JAR file directory (" + jarDir + ") does not exist.");
  } else if (err.code === 'EACCES') {
    logger.log('ERROR', "Permission denied trying to open JAR file directory.");
  } else {
    logger.log('ERROR', "Unexpected error reading JAR file directory.\n" + err);
  }
  return;
}

// Verify existence and content of triggerfile
if (jarDirFiles.indexOf('triggerfile') < 0) {
  logger.log('ERROR', "The triggerfile cannot be found.");
} else {
  fs.readFile(jarDir + 'triggerfile', 'utf8', function(err, data) {
    if (err) {
      logger.log('ERROR', "Unexpected error reading triggerfile.\n" + err);
    } else {
      if (data.search('::jarfilenames') < 0) logger.log('ERROR', "Missing '::jarfilenames' in triggerfile.");
      if (data.search('::ossuserids') < 0) logger.log('ERROR', "Missing '::jarfilenames' in triggerfile.");
      if (data.search('::emailidsforjarfileprocessingstatus') < 0) logger.log('ERROR', "Missing '::jarfilenames' in triggerfile.");
      if (data.search('::complete') < 0) logger.log('ERROR', "Missing '::jarfilenames' in triggerfile.");

      if (data.search('::jarfilenames') > -1 && data.search('::ossuserids') > -1 && data.search('::emailidsforjarfileprocessingstatus') > -1 && data.search('::complete') > -1) {
        var triggerSections = data.match(/::jarfilenames[\s]+([\S\s]+)[\s]*::ossuserids[\s]+([\S\s]+)[\s]*::emailidsforjarfileprocessingstatus[\s]+([\S\s]+)[\s]*::complete/);
        if (triggerSections[1].trim() === "") {
          var triggerFileNames = [];
        } else {
          var triggerFileNames = triggerSections[1].trim().split(/[\s]+/);
        }
        if (triggerSections[2].trim() === "") {
          var triggerOssIds = [];
        } else {
          var triggerOssIds = triggerSections[2].trim().split(/[\s]+/);
        }
        if (triggerSections[3].trim() === "") {
          var triggerEmails = [];
        } else {
          var triggerEmails = triggerSections[3].trim().split(/[\s]+/);
        }

        if (triggerFileNames.length < 1) {
          logger.log('ERROR', "No files listed in '::jarfilenames' section of triggerfile.");
        } else {
          triggerFileNames.forEach(function(tFile) {
            if (jarDirFiles.indexOf(tFile) < 0) logger.log('ERROR', "JAR file '" + tFile + "' listed in triggerfile does not exist.");
          });
          jarDirFiles.forEach(function(jarFile) {
            if (jarFile.search(/\.jar$/i) > -1 && triggerFileNames.indexOf(jarFile) < 0) {
              logger.log('ERROR', "JAR file '" + jarFile + "' missing from triggerfile.");
            }
          });
        }
        if (triggerOssIds.length < 1) logger.log('ERROR', "No OSS IDs listed in '::ossuserids' section of triggerfile.");
        if (triggerEmails.length < 1) logger.log('ERROR', "No email addresses listed in '::emailidsforjarfileprocessingstatus' section of triggerfile.");
      }
    }
  });
}

// Remove all files/directories from jarFiles array which don't end in .jar
for (var i = 0; i < jarDirFiles.length; i++) {
  if (jarDirFiles[i].search(/\.jar$/i) < 0 && jarDirFiles[i]) {
    jarDirFiles.splice(i, 1);
    i--;
  }
}

// Quit if no JAR files are found for the specified release/build
if (jarDirFiles.length < 1) {
  logger.log('ERROR', "No JAR files found in '" + jarDir + "'.");
  return;
}

// Match each JAR file to the expected package types
var jarFiles = {};
jarDirFiles.forEach(function(jar) {
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
        logger.log('WARN', "The " + config.pkgTypes[i].name + " package was matched to multiple JAR files. Ignored: " + jar + ".");
      }
    }
  }
  if (! matched) logger.log('WARN', "The JAR file '" + jar + "' did not match any expected names and will be ignored.");
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
bomJarTypes.forEach(function(jarType) {
  if (! jarFiles[jarType]) logger.log('ERROR', "The " + config.pkgTypes[jarType].name + " JAR file cannot be found.");
});

// Show warning if unexpected JAR file exists (as compared to BOM)
for (jarType in jarFiles) {
  if (bomJarTypes.indexOf(jarType) < 0) {
    logger.log('WARN', "Unexpected JAR file (" + jarFiles[jarType].fileName + ") will be ignored.");
    delete jarFiles[jarType];
  }
}

// All items in jarFiles should now be valid - begin verification
logger.log('INFO', "Verifying content of " + Object.keys(jarFiles).length + " JAR files...");
var jarData = {};
var activeCount = 0;
for (jarType in jarFiles) {
  activeCount++;
  jarData[jarType] = {};
  getJarContent(jarType).then(function(jarContent) {
    // Save checksum data
    jarData[jarContent.jarType].inputFileChecksum = jarContent.inputFileChecksum;
    jarData[jarContent.jarType].changeFileChecksum = jarContent.changeFileChecksum;
    jarData[jarContent.jarType].readmeFileChecksum = jarContent.readmeFileChecksum;
    jarData[jarContent.jarType].xmlFileChecksum = jarContent.xmlFileChecksum;
    jarData[jarContent.jarType].binFileChecksum = jarContent.binFileChecksum;

    // Verify input XML data
    if (jarContent.inputFile !== null) {
      logger.log('DEBUG', "Verifying input XML for " + config.pkgTypes[jarContent.jarType].name + " package.");
      verifyInputXML(jarContent).then(function() {
        // Verify package XML data
        if (jarContent.xmlFile !== null) {
          logger.log('DEBUG', "Verifying package XML for " + config.pkgTypes[jarContent.jarType].name + " package...");
          verifyPackageXML(jarContent).then(function() {
            // Verify readme data
            if (jarContent.readmeFile !== null) {
              logger.log('DEBUG', "Verifying README file for " + config.pkgTypes[jarContent.jarType].name + " package...");
              verifyReadmeFile(jarContent).then(function() {
                // Verify change history data
                if (jarContent.changeFile !== null) {
                  logger.log('DEBUG', "Verifying Change History file for " + config.pkgTypes[jarContent.jarType].name + " package...");
                  verifyChangeFile(jarContent).then(function() {
                    // Verify payload
                    if (jarContent.binFileName !== null) {
                      logger.log('DEBUG', "Verifying payload for " + config.pkgTypes[jarContent.jarType].name + " package...");
                      jarData[jarContent.jarType].binFileContent = {};
                      verifyPayloadFile(jarContent).then(function() {
                        // Verify version and subversion as compared to last build
                        var savedBuilds = Object.keys(savedData);
                        if (workingBuild.match(/^[0-9]+(?:\.[0-9]+)?$/)) {
                          var buildToCompare = workingBuild;
                        } else {
                          // Generate a fake build number if this isn't a released build
                          if (savedBuilds.length > 0) {
                            var buildToCompare = Number(savedBuilds.sort()[savedBuilds.length - 1]) + 1;
                          } else {
                            var buildToCompare = 1;
                          }
                        }
                        savedBuilds.push(buildToCompare);
                        if (savedBuilds.sort().indexOf(buildToCompare) > 0) {
                          var lastSavedBuild = savedBuilds[savedBuilds.sort().indexOf(buildToCompare) - 1];
                          var lastVersion = savedData[lastSavedBuild].jarData[jarContent.jarType].version;
                          if (savedData[lastSavedBuild].jarData[jarContent.jarType].bootVersion) {
                            var lastBootVersion = savedData[lastSavedBuild].jarData[jarContent.jarType].bootVersion;
                          }
                          var lastSubVersion = savedData[lastSavedBuild].jarData[jarContent.jarType].subVersion;

                          if (compareVersion(lastVersion, jarData[jarContent.jarType].version) === 0) {
                            // Versions are equal - Compare content between prior build and current JAR
                            if (parseInt(lastSubVersion) > parseInt(jarData[jarContent.jarType].subVersion)) {
                              logger.log('ERROR', "JAR file for the " + config.pkgTypes[jarContent.jarType].name + " package contains an older subversion than the previous build (Build " + lastSavedBuild + ": " + lastSubVersion + ").");
                            } else {
                              var mismatchedFile = [];
                              // Check for components in JAR which don't match last build
                              Object.keys(jarData[jarContent.jarType].binFileContent).forEach(function(jarComponent) {
                                if (! savedData[lastSavedBuild].jarData[jarContent.jarType].binFileContent[jarComponent]) {
                                  if (mismatchedFile.indexOf(jarComponent) < 0) mismatchedFile.push(jarComponent);
                                } else {
                                  if (config.pkgTypes[jarContent.jarType].type === 'dd' && config.pkgTypes[jarContent.jarType].osType === 'linux') {
                                    // Skip Linux driver md5sum comparison
                                    // TODO: Get SCM to bump subversion for any DD rebuild

                                  } else {
                                    if (jarData[jarContent.jarType].binFileContent[jarComponent] !== savedData[lastSavedBuild].jarData[jarContent.jarType].binFileContent[jarComponent]) {
                                      if (mismatchedFile.indexOf(jarComponent) < 0) mismatchedFile.push(jarComponent);
                                    }
                                  }
                                }
                              });
                              // Check for components in last build which don't match JAR
                              Object.keys(savedData[lastSavedBuild].jarData[jarContent.jarType].binFileContent).forEach(function(jarComponent) {
                                if (! jarData[jarContent.jarType].binFileContent[jarComponent]) {
                                  if (mismatchedFile.indexOf(jarComponent) < 0) mismatchedFile.push(jarComponent);
                                } else {
                                  if (config.pkgTypes[jarContent.jarType].type === 'dd' && config.pkgTypes[jarContent.jarType].osType === 'linux') {
                                    // Skip Linux driver md5sum comparison
                                    // TODO: Get SCM to bump subversion for any DD rebuild

                                  } else {
                                    if (jarData[jarContent.jarType].binFileContent[jarComponent] !== savedData[lastSavedBuild].jarData[jarContent.jarType].binFileContent[jarComponent]) {
                                      if (mismatchedFile.indexOf(jarComponent) < 0) mismatchedFile.push(jarComponent);
                                    }
                                  }
                                }

                              });
                              if (parseInt(lastSubVersion) === parseInt(jarData[jarContent.jarType].subVersion)) {
                                if (mismatchedFile.length === 0) {
                                  logger.log('WARN', "JAR file for the " + config.pkgTypes[jarContent.jarType].name + " package is identical to the previous build (" + lastSavedBuild + ").");
                                } else {
                                  mismatchedFile.forEach(function(mismatch) {
                                    logger.log('ERROR', "JAR file for the " + config.pkgTypes[jarContent.jarType].name + " package incorrectly contains the same subversion as the previous build (Build " + lastSavedBuild + ": " + lastSubVersion + ") although file '" + mismatch + "' differs.");
                                  });
                                }
                              }
                            }
                          } else if (compareVersion(lastVersion, jarData[jarContent.jarType].version) === 1) {
                            // JAR version is older than last build - show error
                            logger.log('ERROR', "JAR file for the " + config.pkgTypes[jarContent.jarType].name + " package is for an older version than the previous build (Build " + lastSavedBuild + ": " + lastVersion + ").");
                          }

                          // If boot code exists, show error if it's an older version than the prior build
                          if (jarData[jarContent.jarType].bootVersion || lastBootVersion) {
                            if (compareVersion(lastBootVersion, jarData[jarContent.jarType].bootVersion) === 1) {
                              logger.log('ERROR', "JAR file for the " + config.pkgTypes[jarContent.jarType].name + " package contains an older boot code version than the previous build (Build " + lastSavedBuild + ": " + lastVersion + ").");
                            }
                          }
                        }

                        activeCount--;
                        if (activeCount === 0) {
                          // Save jarData to file for later comparison
                          if (saveBuildInfo) {
                            savedData[workingBuild] = {
                              build: workingBuild,
                              releaseDate: curDate.toISOString(),
                              errors: logger.errorCount,
                              jarData: jarData
                            }
                            putSavedData();
                          }

                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  }, function(err) {
    if (err.code === 'EACCES') {
      logger.log('ERROR', "Permission denied trying to open JAR file: " + err.path);
    } else if (err.code === 'NOINPUTFILE') {
      logger.log('ERROR', "The " + config.pkgTypes[err.jarType].name + " JAR file does not contain an input XML file. No further verification will be performed with this JAR file.");
    } else if (err.code === 'NOCHANGEFILE') {
      logger.log('ERROR', "The " + config.pkgTypes[err.jarType].name + " JAR file does not contain a change history file. No further verification will be performed with this JAR file.");
    } else if (err.code === 'NOREADMEFILE') {
      logger.log('ERROR', "The " + config.pkgTypes[err.jarType].name + " JAR file does not contain a readme file. No further verification will be performed with this JAR file.");
    } else if (err.code === 'NOXMLFILE') {
      logger.log('ERROR', "The " + config.pkgTypes[err.jarType].name + " JAR file does not contain an XML file. No further verification will be performed with this JAR file.");
    } else if (err.code === 'NOBINFILE') {
      logger.log('ERROR', "The " + config.pkgTypes[err.jarType].name + " JAR file does not contain a payload file. No further verification will be performed with this JAR file.");
    } else {
      logger.log('ERROR', "Unexpected error.\n" + err);
    }
  }).catch(function(err) {
    console.dir(err);
  });
}

process.on('exit', function() {
  logger.log('INFO', "Verification complete. Cleaning up temporary files...");

  // Clean up temporary files
  rmdir.sync(tempPath, {gently: tempPath}, function(err) {
    if (err) logger.log('ERROR', "Unable to delete temporary files.\n" + err);
  });

  logger.log('INFO', "Finished all activity with " + logger.errorCount + " errors.");
});