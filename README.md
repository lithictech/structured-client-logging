# structured-client-logging

Logging library for use in any JavaScript environment that can send logs to a remote server.

It is implemented as a single ES5-compatible JS file that can be installed via Yarn/NPM,
a `script` tag, or just copied into your repo.
The only dependencies are `Promise` (or a polyfill),
and `fetch` (or you can provide another method to send logs remotely).

```
yarn add structured-client-logging
npm install --save structured-client-logging
<script src="https://unpkg.com/structured-client-logging/dist/structured-client-logging.min.js" />
```

To use it, configure it after it is required:

```ecmascript 6
// As a library:
import clientLogging from "structured-client-logging";
clientLogging.configure({endpoint: "https://api.lithic.tech/log"})
// Or in a browser:
window.structuredClientLogging.configure({endpoint: "https://api.lithic.tech/log"})
```

Please note that the logger should always be configured if it is used;
by default log messages are queued until configuration is done.
If you want to disable logging, use `configure({disabled: true})`.

The logger is simple structured-logging style logger that should be familiar from
common structured logging libraries:

```ecmascript 6
// As a library:
import clientLogging from "structured-client-logging";
let logger = clientLogging.createLogger('payments')
// Or in a browser:
let logger = window.structuredClientLogging.createLogger('payments')

// When creating a logger, you can pass in fields that will be included in every message:
let logger = clientLogging.createLogger('payments', {provider: 'Stripe'})

// Loggers have debug, info, warn, and error methods
logger.debug('clicked')
logger.info('submitted')
logger.warn('hmmm')
logger.error('failed')

// Every method takes a second argument which are additional structured fields:
logger.error('failed', {clicked_button: 'Submit'})

// Additionally, loggers have a 'bind' method, which creates a new logger
// that includes the additional fields.
logger = clientLogging.createLogger('testing', {x: 1})
let logger2 = logger.bind({y: 1})
logger.info('hi', {z: 1}) // Has fields {x: 1, z: 1}
logger2.info('hi') // Has fields {x: 1, y: 1}

// Flush any pending logs.
clientLogger.flush()
// flush() returns a promise so you can know after logs have been sent.
clientLogger.flush().finally(() => (window.location.href = newHref));
```

## Serverside

The payload that is sent to the server is:

```json
{
  "*": "value of requestFields fields passed in during configure()",
  "lines": [
    {
      "logger": "name of the logger from the createLogger method",
      "at": "timestamp of when the log event was called",
      "level": "level name: debug, info, warn, error",
      "event": "string passed to logger method, so 'testing' for logger.info('testing')",
      "context": {
        "*": "keys and values here are all the fields built up in createLogger, info/etc, and bind calls"
      }
    }
  ]
}
```

## API Reference

### `configure(options)`

Configure logging.

**Important:** `configure` must be called;
if you do not want to log, use `configure({disabled: true}).

- `options.disabled`: Pass a truthy value to disable logging.
  Note that logging should ALWAYS be configured; if you don't want to log, set `disabled`.
  Otherwise, log messages will queue (up to `lineBuffer`).
- `options.endpoint`: Logs are POSTed to this endpoint as JSON via `fetch` with `cors`.
  See `sendLogs` if you need more customization.
- `options.requestFields`: Added to the serverside request verbatim. This could be something like:
  `{application: "myapp-client", subsystem: "router"}`.
  Note that, in general, the server should be doing enrichment of the logs,
  so you probably don't want to include things like 'environment', though you certain can,
  if client and server environments do not have parity.
- `options.lineBuffer`: Maximum lines to buffer before sending to the server. Default: 50.
- `options.interval`: Publish logs every this many milliseconds. Defaults to 10 seconds.
- `options.level`: One of 'debug', 'info', 'warn', 'error'. Logs with a lower level than this
    will be skipped.
- `options.sendLogs`: Function that accepts `payload` (the server request payload described above)
  that will make the HTTP call to the server. Use this if you need to customize more than the HTTP endpoint,
  or you do not want to use `fetch`.

### `createLogger(name, fields) -> Logger`

Returns a new logger.

- `name`: Name of the logger.
- `fields`: Fields included in the `context` in all messages for this logger.

### `Logger.debug|info|warn|error(event, fields)`

Log an event/message.

- `event`: Name of the event/message string.
- `fields`: Fields to include in the `context` for this event/message.

### `Logger.bind(fields) -> Logger`

Return a new logger that will include fields.
Does not modify the initial logger.

- `fields`: Fields to include in the `context` for all messages for this logger.

### `flush() -> Promise`

Send all pending logs to the server. Use this before you navigate away from a page.
The returned promise will resolve or reject depending on the result of sendLogs.
