const crypto = require("crypto");
const pinoHttp = require("pino-http");
const logger = require("../shared/logger");

// One log line per request, and a correlation id that ties everything about
// that request together.
//
// morgan wrote `GET /api/v1/products 200 12.4ms` and nothing else, so a log
// line from deep in a service could not be connected to the request that
// produced it. Every line now carries the same `reqId`, which also goes back
// on the response as `X-Request-Id` - so a user reporting a failure can quote
// it and it can be found directly.

const requestLog = pinoHttp({
  logger,

  // Honour an id from upstream when there is one, so a request keeps a single
  // identity across a proxy or another service. Generated otherwise.
  genReqId: (req, res) => {
    const inbound = req.headers["x-request-id"];
    // Only accept something id-shaped; a header is attacker-controlled and
    // this value ends up in every log line for the request.
    const id =
      typeof inbound === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(inbound)
        ? inbound
        : crypto.randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },

  // A successful read is not news; a server error is. Logging every 200 at
  // info makes the interesting lines harder to find, not easier.
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "debug";
  },

  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,

  // Keep the shape small. The full header dump pino-http logs by default is
  // noise, and one of those headers is a bearer token.
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      // Resolved through Express's trust-proxy setting, so this is the real
      // client rather than the proxy (see config.trustProxyHops).
      ip: req.raw?.ip,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },

  // Health probes hit constantly and say nothing.
  autoLogging: {
    ignore: (req) => req.url === "/health" || req.url === "/health/ready",
  },
});

module.exports = requestLog;
