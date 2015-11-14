var util        = require('util');
var path        = require('path');
var fs          = require('fs');
var stream      = require('stream');

var xml2object  = require('xml2object');

// Read configuration file
try {
  var config = require('../config.js');
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

// Verify UX Package payload file has been passed as an argument
if (! process.argv[2]) {
  console.log("Usage: node pldm-extract.js <Payload File>" +
    "\nWhere <Payload File> is the name of a UX Package payload file.\n");
  return 1;
}

// Read in the specified payload file
var binFile = process.argv[2];

fs.readFile(binFile, function(err, data) {
  if (err) {
    if (err.code === 'ENOENT') {
      util.log("[ERROR] Specified payload file does not exists.\n");
    } else if (err.code === 'EACCES') {
      util.log("[ERROR] Permission denied trying to open specified payload file.\n");
    } else {
      util.log("[ERROR] Unexpected error: " + err);
    }
    return 1;
  }

  var xmlStart = data.indexOf('<IBMBladeCenterFWUpdFmt>');
  if (xmlStart < 0) return util.log("[ERROR] Unable to find start of PLDM binary section of payload file.\n");
  var xmlEnd = data.indexOf('</IBMBladeCenterFWUpdFmt>') + 25;
  if (xmlEnd < 0) return util.log("[ERROR] Unable to find end of PLDM binary section of payload file.\n");
  var xmlRawData = data.slice(xmlStart, xmlEnd).toString();

  console.log("PLDM XML Data:\n==============\n");
  console.log(xmlRawData + "\n");

  var xmlStream = new stream.Readable();
  xmlStream._read = function noop() {};
  xmlStream.push(xmlRawData);
  xmlStream.push(null);

  var parser = new xml2object([ 'IBMBladeCenterFWUpdFmt' ], xmlStream);
  parser.on('object', function(name, obj) {
    var xmlData = obj;
    if (! xmlData.image || ! xmlData.image.size) {
      return util.log("[ERROR] Unable to find firmware image size in PLDM XML data.\n");
    } else {
      var fwSize = parseInt(xmlData.image.size);
      var fwImage = data.slice(xmlEnd, xmlEnd + fwSize);

      // Back up old firmware image for this payload then save the new image
      var imageFileName = path.basename(binFile).replace(/(?:exe|bin)$/, 'pldm');
      try {
        var oldImageFile = fs.readFileSync(config.dataDir + imageFileName);
        var curDate = new Date();
        var buName = imageFileName + '-' + curDate.getFullYear() + (curDate.getUTCMonth() + 1) + curDate.getDate() + curDate.getHours() + curDate.getMinutes() + curDate.getSeconds();
        fs.writeFileSync(config.dataDir + buName, oldImageFile);
        util.log("[INFO] An existing PLDM firmware image for this package has been backed up.");
      } catch (err) {
        if (err.code !== 'ENOENT') return util.log("[ERROR] Problem backing up old PLDM firmware image. New image will not be saved.\n" + err);
      }

      fs.writeFile(config.dataDir + imageFileName, fwImage, function(err) {
        if (err) return util.log("[ERROR] Unable to write PLDM firmware image to disk.\n" + err);
        util.log("[INFO] The PLDM firmware image has been written to '" + config.dataDir + imageFileName + "'.");
      });
    }
  });
  parser.start();
});