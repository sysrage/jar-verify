#!/usr/bin/env node
/* Verify UX Package JAR files based on BOM file using Node.js
 * Written by Brian Bothwell (brian.bothwell@avagotech.com)
 *
 * To use, run: `node jar-verify.js <parameters>`
 *
 * Available Parameters:
 *  -b | --build    - (Required) Specifies the build number to verify.
 *  -r | --release  - (Required) Specifies the release name to verify.
 *  -s | --save     - Save the specified release/build as a delivered build.
 *
 * Note: The BOM file XLS must have already been parsed with parse-bom.js
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
    util.log("[ERROR] Parameter 'version' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
  } else {
    // Verify version
    var verMatch = jarContent.inputFile.version.match(/(.+)\-([0-9]+)$/);
    var jarVersion = verMatch[1];
    var jarSubversion = verMatch[2];
    var jarBootVersion = null;

    if (config.pkgTypes[jarContent.jarType].type === 'fw' && config.pkgTypes[jarContent.jarType].preVersion) {
      var verSubMatch = jarVersion.match(new RegExp('^' + config.pkgTypes[jarContent.jarType].preVersion + '(.+)$'));
      if (! verSubMatch) {
        util.log("[ERROR] Pre-version missing in 'version' parameter from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      } else {
        jarVersion = verSubMatch[1];
      }
    }

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
      util.log("[ERROR] Paramater 'category.type' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
    } else {
      if (jarContent.inputFile.category.type !== workingBOM.release) {
        util.log("[ERROR] Invalid value for 'category.type' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      }
    }

    // Verify category
    if (! jarContent.inputFile.category || ! jarContent.inputFile.category.$t) {
      util.log("[ERROR] Paramater 'category' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
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
        util.log("[ERROR] Invalid value for 'category' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      }
    }

    // Verify vendor
    if (! jarContent.inputFile.vendor) {
      util.log("[ERROR] Paramater 'vendor' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
    } else {
      if (! jarContent.inputFile.vendor.match(new RegExp('^' + config.vendor + '$'))) {
        util.log("[ERROR] Invalid value for 'vendor' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      }
    }

    // Verify rebootRequired
    if (! jarContent.inputFile.rebootRequired) {
      util.log("[ERROR] Paramater 'rebootRequired' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
    } else {
      if (jarContent.inputFile.rebootRequired.toLowerCase() !== 'yes') {
        util.log("[ERROR] Invalid value for 'rebootRequired' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      }
    }

    // Verify updateType
    if (! jarContent.inputFile.updateType) {
      util.log("[ERROR] Paramater 'updateType' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
    } else {
      if ((config.pkgTypes[jarContent.jarType].type === 'fw' && jarContent.inputFile.updateType.toLowerCase() !== 'firmware') ||
          (config.pkgTypes[jarContent.jarType].type === 'dd' && jarContent.inputFile.updateType.toLowerCase() !== 'driver')) {
        util.log("[ERROR] Invalid value for 'updateType' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      }
    }

    // Verify updateSelection
    if (! jarContent.inputFile.updateSelection) {
      util.log("[ERROR] Paramater 'updateSelection' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
    } else {
      if (jarContent.inputFile.updateSelection.toLowerCase() !== 'auto') {
        util.log("[ERROR] Invalid value for 'updateSelection' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      }
    }

    // Verify applicableDeviceID entries
    if (! jarContent.inputFile.applicableDeviceIdLabel) {
      util.log("[ERROR] Paramater 'applicableDeviceIdLabel' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
    } else {
      var jarDidList = jarContent.inputFile.applicableDeviceIdLabel;
      if (config.pkgTypes[jarContent.jarType].type === 'fw') {
        var bomDidList = workingBOM.appDIDList['fw'][config.pkgTypes[jarContent.jarType].os][config.pkgTypes[jarContent.jarType].asic];
      } else {
        var bomDidList = workingBOM.appDIDList['dd'][config.pkgTypes[jarContent.jarType].os][config.pkgTypes[jarContent.jarType].proto];
      }
      bomDidList.forEach(function(did) {
        if (jarDidList.indexOf(did) < 0) util.log("[ERROR] The ApplicableDeviceID '" + did + "' is missing from the input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      });
      jarDidList.forEach(function(did) {
        if (bomDidList.indexOf(did) < 0) util.log("[ERROR] The ApplicableDeviceID '" + did + "' is incorrectly included in the input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      });
    }

    // Verify osUpdateData
    if (! jarContent.inputFile.osUpdateData || typeof jarContent.inputFile.osUpdateData !== 'object') {
      util.log("[ERROR] Parameter 'osUpdateData' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
    } else {
      var osUpdateList = Object.keys(jarContent.inputFile.osUpdateData);
      if (! osUpdateList || osUpdateList.length > 1) {
        util.log("[ERROR] Incorrect number of operating systems in parameter 'osUpdateData' from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      } else if (osUpdateList[0] !== config.pkgTypes[jarContent.jarType].osType) {
        util.log("[ERROR] Incorrect OS in parameter 'osUpdateData' from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      } else if (! jarContent.inputFile.osUpdateData[osUpdateList[0]].driverFiles || typeof jarContent.inputFile.osUpdateData[osUpdateList[0]].driverFiles !== 'object') {
        util.log("[ERROR] Missing 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      } else if (! jarContent.inputFile.osUpdateData[osUpdateList[0]].driverFiles.driverFile) {
        util.log("[ERROR] Incorrect format of 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
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

              // Workaround to match existing buggy JARs -- This will be removed
              if (agent.type === '13') {
                if (! bomDriverFileEntries[config.classMap['10']]) bomDriverFileEntries[config.classMap['10']] = [];
                adapter.v2.forEach(function(v2) {
                  if (bomDriverFileEntries[config.classMap['10']].indexOf(v2) < 0) bomDriverFileEntries[config.classMap['10']].push(v2);
                });
              }

              if (! bomDriverFileEntries[config.classMap[agent.type]]) bomDriverFileEntries[config.classMap[agent.type]] = [];
              adapter.v2.forEach(function(v2) {
                if (bomDriverFileEntries[config.classMap[agent.type]].indexOf(v2) < 0) bomDriverFileEntries[config.classMap[agent.type]].push(v2);
              });
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
                util.log("[ERROR] Unspecified OS with multiple 'driverFile' sections from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
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
                    util.log("[ERROR] Duplicate OS entries in 'driverFile' sections from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                  } else {
                    if (! driverFileEntry.arch || uniqueEntries[driverFileEntry.os].indexOf(driverFileEntry.arch) > -1) {
                      util.log("[ERROR] Duplicate OS entries in 'driverFile' sections from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                    } else {
                      uniqueEntries[driverFileEntry.os].push(driverFileEntry.arch);
                    }
                  }
                }

                // Verify OS is expected
                if (! bomOSListUnique[driverFileEntry.os]) {
                  util.log("[ERROR] Unexpected OS (" + driverFileEntry.os + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                }

                // Verify architecture is expected
                if (driverFileEntry.arch) {
                  if (bomOSListUnique[driverFileEntry.os].indexOf(driverFileEntry.arch.replace('x32', 'x86')) < 0) {
                    util.log("[ERROR] Unexpected architecture (" + driverFileEntry.arch + ") for " + driverFileEntry.os + " in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                  }
                }

                // Verify driver file name
                if (! driverFileEntry.name) {
                  util.log("[ERROR] Missing driver name in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                } else if (config.pkgTypes[jarContent.jarType].ddFileName.indexOf(driverFileEntry.name) < 0) {
                  util.log("[ERROR] Unexpected driver name (" + driverFileEntry.name + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                }

                // Verify driver version
                if (! driverFileEntry.version) {
                  util.log("[ERROR] Missing driver version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                } else {
                  if (driverFileEntry.version !== config.pkgTypes[jarContent.jarType].ddVerFormat.replace('##VERSION##', jarVersion)) {
                    util.log("[ERROR] Incorrect driver version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                  }
                }
              }
            });

            // Verify all expected operating systems and architectures are included
            for (var os in bomOSListUnique) {
              if (! uniqueEntries[os]) {
                util.log("[ERROR] Missing OS (" + os + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
              } else {
                if (uniqueEntries[os].length > 0) {
                  bomOSListUnique[os].forEach(function(arch) {
                    if (uniqueEntries[os].indexOf(arch) < 0) {
                      util.log("[ERROR] Missing architecture (" + arch + ") for " + os + " in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
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
                util.log("[ERROR] Unexpected OS (" + jarDriverFileList[0].os + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
              }

              // Verify that only one OS is expected
              if (Object.keys(bomOSListUnique).length > 1) {
                for (var os in bomOSListUnique) {
                  if (os !== jarDriverFileList[0].os) util.log("[ERROR] Missing OS (" + os + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                }
              }
            }

            if (jarDriverFileList[0].arch) {
              for (var os in bomOSListUnique) {
                // Verify that the one listed architecture is expected
                if (bomOSListUnique[os].indexOf(jarDriverFileList[0].arch) < 0) {
                  util.log("[ERROR] Unexpected architecture (" + jarDriverFileList[0].arch + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                }

                // Verify that only one architecture is expected
                if (bomOSListUnique[os].length > 1) {
                  for (var arch in bomOSListUnique[os]) {
                    if (arch !== jarDriverFileList[0].arch) util.log("[ERROR] Missing architecture (" + arch + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                  }
                }
              }
            }

            // Verify driver file name
            if (! jarDriverFileList[0].name) {
              util.log("[ERROR] Missing driver name in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
            } else if (config.pkgTypes[jarContent.jarType].ddFileName.indexOf(jarDriverFileList[0].name) < 0) {
              util.log("[ERROR] Unexpected driver name (" + jarDriverFileList[0].name + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
            }

            // Verify driver version
            if (! jarDriverFileList[0].version) {
              util.log("[ERROR] Missing driver version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
            } else {
              if (jarDriverFileList[0].version !== config.pkgTypes[jarContent.jarType].ddVerFormat.replace('##VERSION##', jarVersion)) {
                util.log("[ERROR] Incorrect driver version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
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
                util.log("[ERROR] Missing classification in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
              } else if (! driverFileEntry.name) {
                util.log("[ERROR] Missing name in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
              } else {
                // Verify entry is not a duplicate
                if (! uniqueEntries[driverFileEntry.classification]) {
                  uniqueEntries[driverFileEntry.classification] = [driverFileEntry.name];
                } else {
                  if (uniqueEntries[driverFileEntry.classification].indexOf(driverFileEntry.name) > -1) {
                    // Commented out to avoid errors due to bad JARs -- This will be removed
                    // util.log("[ERROR] Duplicate entry (" + driverFileEntry.name + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                  } else {
                    uniqueEntries[driverFileEntry.classification].push(driverFileEntry.name);
                  }
                }

                // Verify entry is expected
                if (! bomDriverFileEntries[driverFileEntry.classification] || bomDriverFileEntries[driverFileEntry.classification].indexOf(driverFileEntry.name) < 0) {
                  util.log("[ERROR] Unexpected entry (" + driverFileEntry.name + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                }

                // Verify version is correct
                if (! driverFileEntry.version) {
                  util.log("[ERROR] Missing version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                } else {
                  if (driverFileEntry.classification === '32773' || driverFileEntry.classification === config.classMap['32773']) {
                    // Handle bootcode entry
                    if (! config.pkgTypes[jarContent.jarType].bootRegex) {
                      util.log("[ERROR] Unexpected boot BIOS version in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                    } else {
                      if (! driverFileEntry.version.match(config.pkgTypes[jarContent.jarType].bootRegex)) {
                        util.log("[ERROR] Incorrect boot BIOS version (" + driverFileEntry.version + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                      } else {
                        if (! jarBootVersion) {
                          jarBootVersion = driverFileEntry.version;
                        } else if (jarBootVersion !== driverFileEntry.version) {
                          util.log("[ERROR] Multiple boot BIOS versions specified in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                        }
                      }
                    }
                  } else {
                    // The toUpperCase() is necessary to ensure Saturn FW is correct
                    if (driverFileEntry.version !== jarVersion.toUpperCase()) util.log("[ERROR] Incorrect version (" + driverFileEntry.version + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                  }
                }
              }
            });

            // Verify all expected entries were found
            for (var dfClass in bomDriverFileEntries) {
              if (! uniqueEntries[dfClass]) {
                util.log("[ERROR] Missing entry for classification '" + dfClass + "' in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
              } else {
                bomDriverFileEntries[dfClass].forEach(function(entry) {
                  // Workaround to match existing buggy JARs -- This will be removed
                  if (dfClass === '13' && ! entry.match(/^10DF/)) {
                    // ignore
                  } else {
                    if (uniqueEntries[dfClass].indexOf(entry) < 0) {
                      util.log("[ERROR] Missing entry (" + entry + ") in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                    }
                  }
                });
              }
            }

          } else {
            // Firmware packages should always have multiple entries -- Show error
            util.log("[ERROR] Insufficient number of entries in 'driverFiles' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
          }
        }
      }
    }

    // Verify updateTargetInformation section exists (includes applicableOperatingSystems and applicableMachineTypes)
    if (! jarContent.inputFile.updateTargetInformation) {
      util.log("[ERROR] Section 'updateTargetInformation' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
    } else {
      // Verify applicableOperatingSystems
      if (! jarContent.inputFile.updateTargetInformation.applicableOperatingSystems || ! jarContent.inputFile.updateTargetInformation.applicableOperatingSystems.os) {
        util.log("[ERROR] Parameter 'applicableOperatingSystems' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      } else {
        var inputApplicableOS = jarContent.inputFile.updateTargetInformation.applicableOperatingSystems.os;
        if (! Array.isArray(inputApplicableOS)) var jarApplicableOSList = [inputApplicableOS];
        else var jarApplicableOSList = inputApplicableOS;

        // Verify operating systems are expected
        jarApplicableOSList.forEach(function(os) {
          if (! bomOSListUnique[os]) util.log("[ERROR] Unexpected OS (" + os + ") in 'applicableOperatingSystems' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
        });

        // Verify all expected operating systems were found
        for (var os in bomOSListUnique) {
          if (jarApplicableOSList.indexOf(os) < 0) util.log("[ERROR] Missing OS (" + os + ") in 'applicableOperatingSystems' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
        }
      }

      // Verify applicableMachineTypes
      if (! jarContent.inputFile.updateTargetInformation.applicableMachineTypes || ! jarContent.inputFile.updateTargetInformation.applicableMachineTypes.machineNumber) {
        util.log("[ERROR] Parameter 'applicableMachineTypes' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
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
            util.log("[ERROR] Duplicate machine type entires (" + mt + ") in 'applicableMachineTypes' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
          } else {
            uniqueMT.push(mt);
          }
        });

        // Verify machine types are expected
        uniqueMT.forEach(function(mt) {
          if (jarMTList.indexOf(mt) < 0) util.log("[ERROR] Unexpected machine type (" + mt + ") in 'applicableMachineTypes' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
        });

        // Verify all expected machine types were found
        jarMTList.forEach(function(mt) {
          if (uniqueMT.indexOf(mt) < 0) util.log("[ERROR] Missing machine type (" + mt + ") in 'applicableMachineTypes' section from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
        });
      }
    }

    if (config.pkgTypes[jarContent.jarType].type !== 'fw') {
      // Verify driver package does *not* contain PLDM FW update data
      if (jarContent.inputFile.pldmFirmware) {
        util.log("[ERROR] Section 'pldmFirmware' incorrectly included in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
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
          util.log("[ERROR] Section 'pldmFirmware' incorrectly included in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
        }
      } else {
        // Package supports PLDM FW updates -- Verify pldmFirmware section
        if (! jarContent.inputFile.pldmFirmware) {
          util.log("[ERROR] Section 'pldmFirmware' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
        } else {
          // Verify pldmFileName
          if (! jarContent.inputFile.pldmFirmware.pldmFileName) {
            util.log("[ERROR] Parameter 'pldmFileName' missing from 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
          } else {
            if (jarContent.inputFile.pldmFirmware.pldmFileName.indexOf(jarVersion) < 0) {
              util.log("[WARNING] Package version not found in parameter 'pldmFileName' from 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
            }
          }

          // Verify deviceDescriptor entries
          if (! jarContent.inputFile.pldmFirmware.deviceDescriptor) {
            util.log("[ERROR] Parameter 'deviceDescriptor' missing from 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
          } else {
            var inputDeviceDesc = jarContent.inputFile.pldmFirmware.deviceDescriptor;
            if (! Array.isArray(inputDeviceDesc)) var jarDeviceDescList = [inputDeviceDesc];
            else var jarDeviceDescList = inputDeviceDesc;
            var bomAdapterList = [];
            var bomDeviceCount = 0;
            workingBOM.adapterList.forEach(function(adapter) {
              if (adapter.asic === config.pkgTypes[jarContent.jarType].asic && Object.keys(adapter.pldm).length > 0) {
                bomAdapterList.push(adapter);
                bomDeviceCount += adapter.agent.length;
              }
            });

            // Verify there are no duplicate entries
            var uniqueDevices = [];
            jarDeviceDescList.forEach(function(deviceEntry) {
              if (uniqueDevices.indexOf(deviceEntry) > -1) {
                util.log("[ERROR] Duplicate 'deviceDescriptor' entries in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
              } else {
                uniqueDevices.push(deviceEntry);
              }
            });

            // Verify the number of entries matches supported adapters in BOM
            if (uniqueDevices.length !== bomDeviceCount) {
              util.log("[ERROR] Incorrect number of 'deviceDescriptor' entries in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
            }

            uniqueDevices.forEach(function(devDescEntry) {
              // Verify vendorSpecifier, deviceSpecifier, imageId, and classification are defined
              if (! devDescEntry.vendorSpecifier) {
                util.log("[ERROR] Missing 'deviceDescriptor.vendorSpecifier' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
              } else if (! devDescEntry.deviceSpecifier) {
                util.log("[ERROR] Missing 'deviceDescriptor.deviceSpecifier' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
              } else if (! devDescEntry.imageId) {
                util.log("[ERROR] Missing 'deviceDescriptor.imageId' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
              } else if (! devDescEntry.classification) {
                util.log("[ERROR] Missing 'deviceDescriptor.classification' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
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
                  util.log("[ERROR] Unexpected 'deviceDescriptor' entry in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                }
              }
            });

            // Verify file entries -- Only performed if deviceDescriptor entries are found
            if (! jarContent.inputFile.pldmFirmware.file) {
              util.log("[ERROR] Parameter 'file' missing from 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
            } else {
              var inputPLDMFile = jarContent.inputFile.pldmFirmware.file;
              if (! Array.isArray(inputPLDMFile)) var jarFileList = [inputPLDMFile];
              else var jarFileList = inputPLDMFile;

              // Verify there are no duplicate entries
              var uniqueFiles = [];
              jarFileList.forEach(function(fileEntry) {
                if (uniqueFiles.indexOf(fileEntry) > -1) {
                  util.log("[ERROR] Duplicate 'file' entries in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
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
                util.log("[ERROR] Incorrect number of 'file' entries in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
              }

              var fileCount = 1;
              uniqueFiles.forEach(function(fileEntry) {
                // Verify name, source, version, and offset are defined
                if (! fileEntry.name) {
                  util.log("[ERROR] Missing 'file.name' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                } else if (! fileEntry.source) {
                  util.log("[ERROR] Missing 'file.source' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                } else if (! fileEntry.version) {
                  util.log("[ERROR] Missing 'file.version' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                } else if (! fileEntry.offset) {
                  util.log("[ERROR] Missing 'file.offset' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                } else {
                  // Verify file.name
                  if (fileEntry.name !== fileCount.toString()) {
                    util.log("[ERROR] Unexpected value (" + fileEntry.name + ") for 'file.name' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                  }
                  fileCount++;

                  // Verify file.source
                  var typeIndex = uniqueTypes.indexOf(fileEntry.source);
                  if (typeIndex < 0) {
                    util.log("[ERROR] Invalid value (" + fileEntry.source + ") for 'file.source' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                  } else {
                    // There should only be one entry per classification type
                    uniqueTypes.slice(typeIndex, 1);
                  }

                  // Verify file.version
                  if (fileEntry.version !== jarVersion) {
                    util.log("[ERROR] Invalid value (" + fileEntry.version + ") for 'file.version' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
                  }

                  // Verify file.offset
                  if (fileEntry.offset !== '0') {
                    util.log("[ERROR] Invalid value (" + fileEntry.offset + ") for 'file.offset' in 'pldmFirmware' section of input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
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
      util.log("[ERROR] Parameter 'description' missing from input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
    } else {
      if (config.pkgTypes[jarContent.jarType].bootRegex) {
        var jarDesc = config.pkgTypes[jarContent.jarType].inputDesc.replace('##VERSION##', jarVersion + '-' + jarBootVersion).replace('##RELEASE##', workingBOM.release);
      } else {
        var jarDesc = config.pkgTypes[jarContent.jarType].inputDesc.replace('##VERSION##', jarVersion).replace('##RELEASE##', workingBOM.release);
      }
      if (jarContent.inputFile.description !== jarDesc) {
        util.log("[ERROR] Invalid value for 'description' found in input XML file for the " + config.pkgTypes[jarContent.jarType].name + " package.\n");
      }
    }
  }
}

function verifyPackageXML(jarContent) {
  // console.log(jarContent.xmlFileName);
  // console.log(JSON.stringify(jarContent.xmlFile, null, 2));

}

function verifyReadmeFile(jarContent) {
  // console.log(jarContent.readmeFileName);
  // console.log(jarContent.readmeFile);

}

function verifyChangeFile(jarContent) {
  // console.log(jarContent.changeFileName);
  // console.log(jarContent.changeFile);

}

function verifyPayloadFile(jarContent) {
  var payloadFile = tempPath + jarContent.jarType + '/' + jarContent.binFileName;
  // console.log(payloadFile);

}

/**************************************************************/
/* Start Program                                              */
/**************************************************************/

// Read configuration file
try {
  var config = require('../config.js');
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
    return util.log("[ERROR] Specified build number is invalid.\n");
  }
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

util.log("[STATUS] Building list of JAR files for the specified release and build...\n");

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
        util.log("[WARNING] The " + config.pkgTypes[i].name + " package was matched to multiple JAR files. Ignored: " + jar + ".\n");
      }
    }
  }
  if (! matched) util.log("[WARNING] The JAR file '" + jar + "' did not match any expected names and will be ignored.\n");
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
  if (! jarFiles[jarType]) util.log("[ERROR] The " + config.pkgTypes[jarType].name + " JAR file cannot be found.\n");
});

// Show warning if unexpected JAR file exists (as compared to BOM)
for (jarType in jarFiles) {
  if (bomJarTypes.indexOf(jarType) < 0) {
    util.log("[WARNING] Unexpected JAR file will be ignored: " + jarFiles[jarType].fileName + "\n");
    delete jarFiles[jarType];
  }
}

util.log("[STATUS] Verifying content of " + Object.keys(jarFiles).length + " JAR files...\n");

// All items in jarFiles should now be valid - begin verification
for (jarType in jarFiles) {
  getJarContent(jarType).then(function(jarContent) {
    // Verify input XML data
    // util.log("[STATUS] Verifying input XML for " + config.pkgTypes[jarContent.jarType].name + " package...\n");
    verifyInputXML(jarContent);

    // Verify package XML data
    // util.log("[STATUS] Verifying package XML for " + config.pkgTypes[jarContent.jarType].name + " package...\n");
    verifyPackageXML(jarContent);

    // Verify readme data
    // util.log("[STATUS] Verifying README file for " + config.pkgTypes[jarContent.jarType].name + " package...\n");
    verifyReadmeFile(jarContent);

    // Verify change history data
    // util.log("[STATUS] Verifying Change History file for " + config.pkgTypes[jarContent.jarType].name + " package...\n");
    verifyChangeFile(jarContent);

    // Verify payload
    // util.log("[STATUS] Verifying payload for " + config.pkgTypes[jarContent.jarType].name + " package...\n");
    verifyPayloadFile(jarContent);

  }, function(err) {
    if (err.code === 'EACCES') {
      util.log("[ERROR] Permission denied trying to open JAR file: " + err.path);
    } else if (err.code === 'NOINPUTFILE') {
      util.log("[ERROR] The " + config.pkgTypes[err.jarType].name + " JAR file does not contain an input XML file. No further verification will be performed with this JAR file.\n");
    } else if (err.code === 'NOCHANGEFILE') {
      util.log("[ERROR] The " + config.pkgTypes[err.jarType].name + " JAR file does not contain a change history file. No further verification will be performed with this JAR file.\n");
    } else if (err.code === 'NOREADMEFILE') {
      util.log("[ERROR] The " + config.pkgTypes[err.jarType].name + " JAR file does not contain a readme file. No further verification will be performed with this JAR file.\n");
    } else if (err.code === 'NOXMLFILE') {
      util.log("[ERROR] The " + config.pkgTypes[err.jarType].name + " JAR file does not contain an XML file. No further verification will be performed with this JAR file.\n");
    } else if (err.code === 'NOBINFILE') {
      util.log("[ERROR] The " + config.pkgTypes[err.jarType].name + " JAR file does not contain a payload file. No further verification will be performed with this JAR file.\n");
    } else {
      util.log("[ERROR] Unexpected error: " + err);
    }
  }).catch(function(err) {
    console.dir(err);
  });
}

process.on('exit', function() {
  util.log("[STATUS] Finished all verification steps. Cleaning up...\n");

  // Clean up temporary files
  rmdir.sync(tempPath, {gently: tempPath}, function(err) {
    if (err) util.log("[ERROR] Unable to delete temporary files: " + err);
  });
});