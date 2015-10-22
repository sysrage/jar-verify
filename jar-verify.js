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

// Read configuration file
try {
  var config = require('./config.js');
} catch (err) {
  util.log("[ERROR] Unable to open configuration file.");
  console.log(err);
  return 1;
}

// Verify temp directory exists and is writeable
