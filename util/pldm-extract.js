#!/usr/bin/env node
/* Extract PLDM XML data and firmware image using Node.js
 * Written by Brian Bothwell (brian.bothwell@broadcom.com)
 *
 * To use, run: `node pldm-extract.js <payload file>` where <payload file> is a
 * firmware UX package payload file (bin or exe).
 *
 * Requres:
 *  - Node.js
 *  - pretty-data
 *  - xml2object
 */

var util        = require('util');
var path        = require('path');
var fs          = require('fs');
var stream      = require('stream');

var pd          = require('pretty-data').pd;
var xml2object  = require('xml2object');

var logger      = require('./logger.js');

/**************************************************************/
/* Function/Class Definitions                                 */
/**************************************************************/

// Function to write data to a file but make a backup first if file already exists
function writeWithBackup(file, data, description) {
  try {
    var curDate = new Date();
    var dateString = '' + curDate.getFullYear() + (curDate.getUTCMonth() + 1) + curDate.getDate() + curDate.getHours() + curDate.getMinutes() + curDate.getSeconds();
    var backupFile = file + '-' + dateString;
    var oldFile = fs.readFileSync(file);
    if (! description) var description = "";
    fs.writeFileSync(backupFile, oldFile);
    logger.log('INFO', "An existing " + description + "file for this package has been backed up.");
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.log('ERROR', "Problem backing up old " + description + "file. New data will not be saved.\n" + err);
      return logger.errorCount;
    }
  }

  fs.writeFile(file, data, function(err) {
    if (err) {
      logger.log('ERROR', "Unable to write " + description + "file to disk.\n" + err);
      return logger.errorCount;
    }
    logger.log('INFO', "The " + description + "file has been written to '" + file + "'.");
  });
}


/**************************************************************/
/* Start Program                                              */
/**************************************************************/

// var config = {dataDir: __dirname + '/data/'};
// To use standalone, comment out all 'config' sections below and uncomment the above line

// Read configuration file -- Comment out this section for standalone usage
try {
  var config = require('../config.js');
} catch (err) {
  logger.log('ERROR', "Unable to open configuration file.\n" + err);
  return logger.errorCount;
}

// Create data directory if it doesn't exist -- Comment out this section for standalone usage
if (config.dataDir[config.dataDir.length - 1] !== '/') config.dataDir += '/';
if (! fs.existsSync(config.dataDir)){
  try {
    fs.mkdirSync(config.dataDir);
  } catch (err) {
    logger.log('ERROR', "Unable to create data directory.\n" + err);
    return logger.errorCount;
  }
  logger.log('INFO', "Data directory did not exist. Empty directory created.");
}

// Verify UX Package payload file has been passed as an argument
if (! process.argv[2]) {
  console.log("Usage: node pldm-extract.js <payload file>" +
    "\nWhere <payload file> is the name of a UX Package payload file.\n");
  return 1;
}

// Read in the specified payload file
var binFile = process.argv[2];
fs.readFile(binFile, function(err, data) {
  if (err) {
    if (err.code === 'ENOENT') {
      logger.log('ERROR', "Specified payload file does not exists.");
    } else if (err.code === 'EACCES') {
      logger.log('ERROR', "Permission denied trying to open specified payload file.");
    } else {
      logger.log('ERROR', "Unexpected error opening payload file.\n" + err);
    }
    return logger.errorCount;
  }

  // Find PLDM XML data within payload file
  var tarStart = data.indexOf('pldm.xml');
  if (tarStart < 0) {
    logger.log('ERROR', "Unable to find start of PLDM binary section of payload file.");
    return logger.errorCount;
  }
  var xmlStart = tarStart + 512;
  var xmlSize = parseInt(data.slice(tarStart + 124, tarStart + 136), 8);
  var xmlEnd = xmlStart + xmlSize;
  var xmlBlocks = Math.ceil(xmlSize / 512);
  var xmlRawData = data.slice(xmlStart, xmlEnd).toString();

  // Back up old PLDM XML data for this payload then save the new data
  var xmlFileName = config.dataDir + path.basename(binFile).replace(/(?:\.exe|\.bin)$/, '-pldm.xml');
  writeWithBackup(xmlFileName, pd.xml(xmlRawData), 'PLDM XML data ');

  // Find PLDM firmware image data within payload file
  var binHeader = xmlStart + xmlBlocks * 512;
  var binStart = binHeader + 512;
  var binSize = parseInt(data.slice(binHeader + 124, binHeader + 136), 8);
  var binEnd  = binStart + binSize;
  var binRawData = data.slice(binStart, binEnd);

  // Back up old firmware image for this payload then save the new image
  var binFileName = config.dataDir + path.basename(binFile).replace(/(?:\.exe|\.bin)$/, '-pldm.bin');
  writeWithBackup(binFileName, binRawData, 'PLDM firmware image ');

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
      logger.log('ERROR', "Unable to find firmware image size in PLDM XML data.");
      return logger.errorCount;
    } else {
      var fwSize = parseInt(xmlData.image.size);
      if (fwSize !== binSize) logger.log('ERROR', "Actual firmware image size does not match size specified in PLDM XML data.");
    }
  });
  parser.start();
});