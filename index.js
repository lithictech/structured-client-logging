(function (root, factory) {
  // noinspection JSUnresolvedVariable
  if (typeof define === 'function' && define.amd) {
    // noinspection JSUnresolvedFunction
    define([], function () {
      return (root.boomLogging = factory());
    });
  } else {
    // noinspection JSUnresolvedVariable
    if (typeof module === 'object' && module.exports) {
      // noinspection JSUnresolvedVariable
      module.exports = factory();
    } else {
      root.boomLogging = factory();
    }
  }
}(typeof self !== 'undefined' ? self : this, function () {
  // UTILITIES

  function merge() {
    var o = {}
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
   *
   * @param application
   * @param options
   * @param options.endpoint
   * @param options.requestFields
   * @param options.lineBuffer
   * @param options.interval
   * @param options.sendLogs
   */
  function configure(application, options) {
    options = options || {};
    requestFields = options.requestFields || {};
    maxLineBufferSize = options.lineBuffer || 50;
    if (options.sendLogs) {
      sendLogs = options.sendLogs
    } else {
      sendLogs = function (payload) {
        return fetch(options.endpoint, {
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }).catch(function (r) {
          console.error('Failed to send logs:', r)
        });
      }
    }
    if (intervalHandle !== null) {
      window.clearInterval(intervalHandle)
    }
    intervalHandle = window.setInterval(flush, options.interval || 10000)
  }

  function flush() {
    if (pendingLines.length === 0) {
      return;
    }
    if (!sendLogs) {
      var overflow = pendingLines.length - maxLineBufferSize;
      if (overflow > 0) {
        console.log("WARNING: Dropping " + overflow + " logs because logging is not configured")
        pendingLines = pendingLines.slice(overflow, overflow + maxLineBufferSize)
      }
      return;
    }
    var payload = merge(requestFields, {lines: pendingLines});
    pendingLines = [];
    sendLogs(payload)
  }

  function createLogger(name, fields) {
    function makelog(level) {
      return function (event, context) {
        pendingLines.push({
          logger: name,
          at: new Date().toISOString(),
          level: level,
          event: event,
          context: merge(fields, context)
        })
        if (pendingLines.length >= maxLineBufferSize) {
          flush()
        }
      }
    }

    var logger = {
      debug: makelog('debug'),
      info: makelog('info'),
      warn: makelog('warn'),
      error: makelog('error'),
      bind: function (context) {
        return createLogger(name, merge(fields, context))
      }
    }
    return logger;
  }

  return {configure: configure, createLogger: createLogger, flush: flush}
}));
