const pino = require("pino");
const config = require("../config");

// Structured logging.
//
// This replaces console.log and morgan. The problem with what was here was not
// tidiness: a line like
//
//   console.log(`Error: ${err.message}`.red)
//
// cannot be searched, filtered by severity, or tied to the request that caused
// it. When a user reports "it failed at about 3pm" there was no way to find
// their request among everyone else's. JSON lines with a request id fix that.
//
// pino writes newline-delimited JSON to stdout, which is what every log
// aggregator expects and what Render captures by default. In development
// pino-pretty renders it readably instead.

// Bearer tokens and cookies are credentials. pino-http logs request headers by
// default, so without this every authenticated request would write a usable
// token into the log - which is how logs become the thing you have to rotate
// secrets over. Redaction is applied by pino itself, so it cannot be bypassed
// by a call site passing the header through some other path.
const REDACT = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['set-cookie']",
  "res.headers['set-cookie']",
  // Bodies are not logged, but if a call site ever passes one, these are the
  // fields that must never appear.
  "*.password",
  "*.token",
  "*.jwt",
  "*.secret",
  "password",
  "token",
];

const logger = pino({
  level: config.log.level,

  // The suite drives hundreds of requests through one process; log output
  // would bury the test results.
  enabled: config.log.level !== "silent",

  redact: { paths: REDACT, censor: "[redacted]" },

  // ISO timestamps rather than epoch millis - a human reads these too.
  timestamp: pino.stdTimeFunctions.isoTime,

  base: { env: config.env },

  formatters: {
    // "level":"info" reads better in an aggregator than "level":30.
    level: (label) => ({ level: label }),
  },

  ...(config.isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname,env" },
        },
      }
    : {}),
});

module.exports = logger;
// Exported for tests, so they assert on the config that actually ships
// rather than a copy of it that can drift.
module.exports.REDACT = REDACT;
