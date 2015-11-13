var util        = require('util');
var path        = require('path');
var fs          = require('fs');
var stream      = require('stream');

var xml2object  = require('xml2object');

var binFile = '/Users/bbothwell/Downloads/SUPs/Test/elx-lnvgy_fw_cna_15c-oc14-10.6.228.26-1_linux_32-64.bin';

fs.readFile(binFile, function(err, data) {
  if (err) return console.log(err);
  var xmlStart = data.indexOf('<IBMBladeCenterFWUpdFmt>');
  var xmlEnd = data.indexOf('</IBMBladeCenterFWUpdFmt>') + 25;
  var xmlRawData = data.slice(xmlStart, xmlEnd).toString();

  console.log(xmlRawData);

  var xmlStream = new stream.Readable();
  xmlStream._read = function noop() {};
  xmlStream.push(xmlRawData);
  xmlStream.push(null);

  var parser = new xml2object([ 'IBMBladeCenterFWUpdFmt' ], xmlStream);
  parser.on('object', function(name, obj) {
    var xmlData = obj;
    if (! xmlData.image || ! xmlData.image.size) {
      console.log("Unable to find firmware image size in XML.");
    } else {
      var fwSize = parseInt(xmlData.image.size);
      var fwImage = data.slice(xmlEnd, xmlEnd + fwSize);
      fs.writeFile('/Users/bbothwell/Downloads/SUPs/Test/test.bin', fwImage, function(err) {
        if (err) return console.log(err);
      });
    }
  });
  parser.start();
});