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
var requestFields;
var maxLineBufferSize;
var sendLogs;

// GLOBALS
var pendingLines = [];
var intervalHandle = null;

/**
 * Configure the library for application logging.
 * @param options
 * @param {string} [options.endpoint] Logs are POSTed to this endpoint as JSON via `fetch` with `cors`.
 *   See `sendLogs` if you need more customization.
 * @param {object} [options.requestFields] Added to the serverside request verbatim. This could be something like:
 *   `{application: "myapp-client", subsystem: "router"}`.
 *   Note that, in general, the server should be doing enrichment of the logs,
 *   so you probably don't want to include things like 'environment', though you certain can,
 *   if client and server environments do not have parity.
 * @param {Number} [options.lineBuffer] Maximum lines to buffer before sending to the server. Default: 50.
 * @param {Number} [options.interval] Publish logs every this many milliseconds. Defaults to 10 seconds.
 * @param {function} [options.sendLogs] Function that accepts `payload` (the server request payload described above)
 *   that will make the HTTP call to the server. Use this if you need to customize more than the HTTP endpoint,
 *   or you do not want to use `fetch`.
 */
function configure(options) {
  options = options || {};
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
      });
    };
  }
  if (intervalHandle !== null) {
    window.clearInterval(intervalHandle);
  }
  intervalHandle = window.setInterval(flush, options.interval || 10000);
}

/**
 * Send all pending logs to the server. Use this before you navigate away from a page.
 */
function flush() {
  if (pendingLines.length === 0) {
    return;
  }
  if (!sendLogs) {
    var overflow = pendingLines.length - maxLineBufferSize;
    if (overflow > 0) {
      console.log(
        "WARNING: Dropping " + overflow + " logs because logging is not configured"
      );
      pendingLines = pendingLines.slice(overflow, overflow + maxLineBufferSize);
    }
    return;
  }
  var payload = merge(requestFields, { lines: pendingLines });
  pendingLines = [];
  sendLogs(payload);
}

/**
 * Returns a new logger.
 * @param {string} name Name of the logger.
 * @param {object} [fields] Fields included in the `context` in all messages for this logger.
 * @return {Logger}
 */
function createLogger(name, fields) {
  function makelog(level) {
    return function (event, context) {
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

var _typechecking = false;

if (_typechecking) {
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
