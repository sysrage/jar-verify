/* Parse Lenovo UX Package BOM file and generate JSON object using Node.js
 * Written by Brian Bothwell (brian.bothwell@avagotech.com)
 *
 * To use, run: `node parse-bom.js <BOM file>` where <BOM file> is an XLSX BOM
 *
 * Requres:
 *  - Node.js
 *  - yauzl
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
  return util.log("[ERROR] Unable to open configuration file.\n" + err);
}

var helpText = "Usage: node jar-verify.js <parameters> \n" +
  "\nAvailable Parameters:\n" +
  " -b | --build    - (Required) Specifies the build number to verify.\n" +
  " -r | --release  - (Required) Specifies the release name to verify.\n" +
  " -s | --save     - Save the specified release/build as the previously delivered build.";

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
  var allJarFiles = fs.readdirSync(jarDir);
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
for (var i = 0; i < allJarFiles.length; i++) {
  if (allJarFiles[i].search(/\.jar$/i) < 0) {
    allJarFiles.splice(i, 1);
    i--;
  }
}

// Quit if no JAR files are found for the specified release/build
if (allJarFiles.length < 1) return util.log("[ERROR] No JAR files found in '" + jarDir + "'.\n");

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
