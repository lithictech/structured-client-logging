"use strict";

// UTILITIES

function merge() {
  var o = {};
  for (var i = 0; i < arguments.length; i++) {
    var it = arguments[i];
    for (var attrname in it) {
      if (it.hasOwnProperty(attrname)) {
        o[attrname] = it[attrname];
      }
    }
  }
  return o;
}

// CONFIG STORAGE
var disabled = null;
var requestFields;
var maxLineBufferSize;
var sendLogs;
var globalLevelNum = 0;

// GLOBALS
var pendingLines = [];
var intervalHandle = null;
var levelMap = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Configure the library for application logging.
 * @param options
 * @param {boolean} [options.disabled] True to turn off logging.
 * @param {string} [options.endpoint] Logs are POSTed to this endpoint as JSON via `fetch` with `cors`.
 *   See `sendLogs` if you need more customization.
 * @param {object} [options.requestFields] Added to the serverside request verbatim. This could be something like:
 *   `{application: "myapp-client", subsystem: "router"}`.
 *   Note that, in general, the server should be doing enrichment of the logs,
 *   so you probably don't want to include things like 'environment', though you certain can,
 *   if client and server environments do not have parity.
 * @param {Number} [options.lineBuffer] Maximum lines to buffer before sending to the server. Default: 50.
 * @param {Number} [options.interval] Publish logs every this many milliseconds. Defaults to 10 seconds.
 * @param {string} [options.level] Log level. 'debug', 'info', 'warn', 'error',
 *   just like the log methods. Log messages with a level lower than this level will be skipped.
 *   By default, log everything. If level is invalid, console.error a warning and skip.
 * @param {logsender} [options.sendLogs] Function that accepts `payload` (the server request payload described above)
 *   that will make the HTTP call to the server, and return a Promise.
 *   Use this if you need to customize more than the HTTP endpoint,
 *   or you do not want to use `fetch`.
 */
function configure(options) {
  options = options || {};
  if (options.disabled) {
    disabled = true;
    requestFields = null;
    sendLogs = null;
    pendingLines = [];
    if (intervalHandle) {
      clearInterval(intervalHandle);
    }
    return;
  }
  if (levelMap[options.level]) {
    globalLevelNum = levelMap[options.level];
  } else {
    console.error("invalid log level:", options.level);
  }
  requestFields = options.requestFields || {};
  maxLineBufferSize = options.lineBuffer || 50;
  if (options.sendLogs) {
    sendLogs = options.sendLogs;
  } else {
    sendLogs = function (payload) {
      return fetch(options.endpoint, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch(function (r) {
        console.error("Failed to send logs:", r);
        return Promise.reject(r);
      });
    };
  }
  if (intervalHandle !== null) {
    clearInterval(intervalHandle);
  }
  intervalHandle = setInterval(flush, options.interval || 10000);
}

/**
 * Send all pending logs to the server. Use this before you navigate away from a page.
 */
function flush() {
  if (pendingLines.length === 0) {
    return Promise.resolve();
  }
  if (!sendLogs) {
    var overflow = pendingLines.length - maxLineBufferSize;
    if (overflow > 0) {
      console.log(
        "WARNING: Dropping " + overflow + " logs because logging is not configured"
      );
      pendingLines = pendingLines.slice(overflow, overflow + maxLineBufferSize);
    }
    return Promise.resolve();
  }
  var payload = merge(requestFields, { lines: pendingLines });
  pendingLines = [];
  return sendLogs(payload);
}

/**
 * Returns a new logger.
 * @param {string} name Name of the logger.
 * @param {object} [fields] Fields included in the `context` in all messages for this logger.
 * @return {Logger}
 */
function createLogger(name, fields) {
  function makelog(level) {
    var levelNum = levelMap[level];
    return function (event, context) {
      if (disabled) {
        return;
      }
      if (levelNum < globalLevelNum) {
        return;
      }
      pendingLines.push({
        logger: name,
        at: new Date().toISOString(),
        level: level,
        event: event,
        context: merge(fields, context),
      });
      if (pendingLines.length >= maxLineBufferSize) {
        flush();
      }
    };
  }

  // noinspection JSUnusedGlobalSymbols
  var logger = {
    debug: makelog("debug"),
    info: makelog("info"),
    warn: makelog("warn"),
    error: makelog("error"),
    bind: function (context) {
      return createLogger(name, merge(fields, context));
    },
  };
  return logger;
}

var _exports = { configure: configure, createLogger: createLogger, flush: flush };

// This ends up getting overwritten by UMD but do it here so we can import our code like a normal lib.
// noinspection JSUnresolvedVariable
if (typeof module === "object" && module.exports) {
  // noinspection JSUnresolvedVariable
  module.exports = _exports;
}

/**
 * @typedef Logger
 * @property {logfunc} debug
 * @property {logfunc} info
 * @property {logfunc} warn
 * @property {logfunc} error
 * @property {function(object) : Logger} bind
 */

/**
 * @callback logfunc
 * @param {string} event Event name or message to log.
 * @param {object} fields Additional context for the log message.
 */

/**
 * @callback logsender
 * @param {object} payload Logging payload. See README#Serverside for details.
 * @return {Promise}
 */
