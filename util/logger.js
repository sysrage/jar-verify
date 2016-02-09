#!/usr/bin/env node
/* Logging module for Node.js
 * Written by Brian Bothwell (brian.bothwell@broadcom.com)
 *
 *
 * Requres:
 *  - Node.js
 *
 */

var util    = require('util');
var path    = require('path');
var fs      = require('fs');

var logger = exports;
var logDir = path.join(__dirname + '/../logs/');
logger.scriptName = 'unknown';
logger.logLevel = 'ERROR';
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
    // console.log('logDir:' + logDir);
    // console.log('scriptName: ' + logger.scriptName);

    // TODO:

  }
}