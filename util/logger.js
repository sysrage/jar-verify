#!/usr/bin/env node
/* Logging module for Node.js
 * Written by Brian Bothwell (brian.bothwell@broadcom.com)
 *
 *
 * Requres:
 *  - Node.js
 *
 */

var path    = require('path');
var fs      = require('fs');

var logger = exports;
var logDir = path.join(__dirname, '/../logs/');
var startDate = new Date();
var dateString = '' + startDate.getFullYear() + String('00' + (startDate.getUTCMonth() + 1)).slice(-2) + String('00' + startDate.getDate()).slice(-2) + String('00' + startDate.getHours()).slice(-2) + String('00' + startDate.getMinutes()).slice(-2) + String('00' + startDate.getSeconds()).slice(-2);
logger.scriptName = 'unknown';
logger.logLevel = 'ERROR';
logger.logToFile = true;
logger.errorCount = 0;

logger.log = function(level, message) {
  var levels = ['DEBUG', 'ERROR', 'WARN', 'INFO'];
  level = level.toUpperCase();
  if (typeof message !== 'string') message = JSON.stringify(message);

  // Increment error counter if level is 'ERROR'
  if (level === 'ERROR') logger.errorCount++;

  if (levels.indexOf(level) >= levels.indexOf(logger.logLevel)) {
    // Display message to console
    console.log("[" + level + "] " + message + "\n");

    // Write message to log file
    if (logger.logToFile) {
      var logFile = logger.scriptName + '-' + dateString + '.log';
      var logPath = path.join(logDir, logFile);
      var curDate = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
      var logMessage = curDate + " - [" + level + "] " + message + "\n\n";
      try {
        fs.appendFileSync(logPath, logMessage);
      } catch (err) {
        console.log("[ERROR] Unable to write to log file.\n" + err + "\n");
      }
    }
  }
}

// Create log directory if it doesn't exist
if (! fs.existsSync(logDir)){
  try {
    fs.mkdirSync(logDir);
  } catch (err) {
    console.log("[ERROR] Unable to create log directory. Log messages will not be saved.\n" + err + "\n");
    logger.logToFile = false;
    return;
  }
  console.log("[INFO] Log directory did not exist. Empty directory created.\n");
}