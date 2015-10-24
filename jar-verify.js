/* Parse Lenovo UX Package BOM file and generate JSON object using Node.js
 * Written by Brian Bothwell (brian.bothwell@avagotech.com)
 *
 * To use, run: `node parse-bom.js <BOM file>` where <BOM file> is an XLSX BOM
 *
 * Requres:
 *  - Node.js
 *  - unzip
 *
 */

var util    = require('util');
var path    = require('path');
var fs      = require('fs');

var yauzl   = require('yauzl');

// Read configuration file
try {
  var config = require('./config.js');
} catch (err) {
  util.log("[ERROR] Unable to open configuration file.\n");
  console.log(err);
  return 1;
}

// ***TODO: This needs to be modified to handle user specified release and build
var jarDir = config.jarDir + '/15C/Build 33.10/';

// Gather list of JAR files in jarDir
try {
  var allJarFiles = fs.readdirSync(jarDir);
} catch (err) {
  if (err.code === 'ENOENT') {
    util.log("[ERROR] The JAR file directory (" + jarDir + ") does not exist.\n");
  } else if (err.code === 'EACCES') {
    util.log("[ERROR] Permission denied trying to open JAR file directory.\n");
  } else {
    util.log("[ERROR] Unexpected error: " + err);
  }
  return 1;
}

// Remove all files/directories from jarFiles array which don't end in .jar
for (var i = 0; i < allJarFiles.length; i++) {
  if (allJarFiles[i].search(/\.jar$/i) < 0) {
    allJarFiles.splice(i, 1);
    i--;
  }
}

// Quit if no JAR files are found
if (allJarFiles.length < 1) {
  util.log("[ERROR] No JAR files found in '" + jarDir + "'.\n");
  return 1;
}

// Match each JAR file to the expected package types
var jarFiles = {};
allJarFiles.forEach(function (jar) {
  var matched = false;
  for (i in config.pkgTypes) {
    var matchResult = jar.match(config.pkgTypes[i].regex);
    if (matchResult) {
      matched = true;
      if (! jarFiles[i]) {
        jarFiles[i] = { fileName: jar, jarVersion: matchResult[1] };
      } else {
        util.log("[WARNING] The " + config.pkgTypes[i].name + " package was matched to multiple JAR files. Ignored: " + jar + ".");
      }
    }
  }
  if (! matched) util.log("[WARNING] The JAR file '" + jar + "' did not match any expected names.");
});



  // yauzl.open(jarDir + jar, function(err, zipfile) {
  //   if (err) throw err;
  //   zipfile.on("entry", function(entry) {
  //     console.dir(zipfile);
  //     console.dir(entry);
  //     if (/\/$/.test(entry.fileName)) {
  //       // directory file names end with '/'
  //       return;
  //     }
  //     zipfile.openReadStream(entry, function(err, readStream) {
  //       if (err) throw err;
  //       // ensure parent directory exists, and then:
  //       readStream.pipe(fs.createWriteStream(entry.fileName));
  //     });
  //   });
  // });
