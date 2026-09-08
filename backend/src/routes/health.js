const express = require("express");
const mongoose = require("mongoose");
const config = require("../config");

const router = express.Router();

// Liveness and readiness are different questions, and answering only the first
// one is how a deploy serves traffic it cannot handle.
//
// The previous single /health returned `{ status: "ok" }` unconditionally. It
// could not fail while the process was up, so it said nothing about whether
// the app could actually serve a request - an instance with no database
// connection passed it happily and got sent traffic.

// LIVENESS: is this process alive and able to answer?
//
// Deliberately checks nothing external. A liveness probe that fails on a
// database blip gets the container killed and restarted, which does not fix a
// database and turns a partial outage into a restart loop.
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    env: config.env,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// READINESS: should this instance be sent traffic right now?
//
// Answers no while the database is unreachable, so a load balancer can route
// around it instead of the requests failing one at a time. 503 is the honest
// status - the instance is temporarily unable, not broken.
const READY_STATES = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

router.get("/health/ready", async (req, res) => {
  const state = mongoose.connection.readyState;
  const connected = state === 1;

  // readyState only says a socket is open. A ping proves the server is
  // actually answering, which is the thing a request depends on.
  let reachable = false;
  if (connected) {
    try {
      await mongoose.connection.db.admin().ping();
      reachable = true;
    } catch {
      reachable = false;
    }
  }

  const ready = connected && reachable;

  res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? "ready" : "not ready",
    checks: {
      database: {
        state: READY_STATES[state] ?? String(state),
        reachable,
      },
    },
  });
});

module.exports = router;
