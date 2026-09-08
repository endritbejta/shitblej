const mongoose = require("mongoose");
const logger = require("../shared/logger");

// A rate-limit counter store backed by MongoDB.
//
// WHY THIS EXISTS
// express-rate-limit's default store keeps counters in process memory, which
// silently divides every limit by however many processes are running. Probing
// the deployed API showed two concurrent windows with independent counters -
// two processes - so the configured "10 login attempts per 15 minutes" was
// really ~20, and it would weaken further with every instance added. A limit
// that changes when you scale is not a limit.
//
// WHY MONGO AND NOT REDIS
// Redis is the conventional choice and is faster, but it means provisioning
// another managed service and another connection string. The database is
// already here, already connected, and a counter increment is one indexed
// document write - cheap next to the queries these routes already make. If
// this ever becomes hot enough to matter, swapping in rate-limit-redis is a
// change to this file alone.

const CounterSchema = new mongoose.Schema(
  {
    // The client key express-rate-limit hands us (an IP, by default), used
    // directly as _id so an increment is a single primary-key upsert.
    _id: { type: String },
    hits: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

// Let MongoDB reap finished windows. Nothing reads an expired counter - the
// increment below starts a fresh window when it finds one - so this is purely
// to stop the collection growing forever.
CounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Counter = mongoose.model("RateLimitCounter", CounterSchema);

class MongoRateLimitStore {
  // express-rate-limit sets this to tell us the keys are shared, not
  // per-process, which is the entire point.
  localKeys = false;

  init(options) {
    this.windowMs = options.windowMs;
  }

  // One atomic document update does the whole decision, so concurrent
  // requests cannot both "start" a window and lose a count between them.
  // Both branches read the pre-update `expiresAt`, because every expression in
  // a single $set stage is evaluated against the incoming document.
  async increment(key) {
    try {
      const doc = await Counter.findOneAndUpdate(
        { _id: key },
        [
          {
            $set: {
              expiresAt: {
                $cond: [
                  { $gt: ["$expiresAt", "$$NOW"] },
                  "$expiresAt",
                  { $add: ["$$NOW", this.windowMs] },
                ],
              },
              hits: {
                $cond: [
                  { $gt: ["$expiresAt", "$$NOW"] },
                  { $add: [{ $ifNull: ["$hits", 0] }, 1] },
                  1,
                ],
              },
            },
          },
        ],
        { upsert: true, new: true }
      ).lean();

      return { totalHits: doc.hits, resetTime: doc.expiresAt };
    } catch (err) {
      // Fail open, deliberately. If the database is unreachable the request is
      // going to fail at the data layer anyway - login cannot verify a
      // password without it - so refusing traffic here would turn a database
      // blip into a hard outage while protecting nothing.
      logger.error({ err }, "rate limit store unavailable - allowing request");
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  // Called when a request should not have counted (skipFailedRequests etc.).
  async decrement(key) {
    try {
      await Counter.updateOne(
        { _id: key, expiresAt: { $gt: new Date() }, hits: { $gt: 0 } },
        { $inc: { hits: -1 } }
      );
    } catch {
      /* a lost decrement only makes the limit very slightly stricter */
    }
  }

  async resetKey(key) {
    try {
      await Counter.deleteOne({ _id: key });
    } catch {
      /* nothing to reset */
    }
  }

  async resetAll() {
    try {
      await Counter.deleteMany({});
    } catch {
      /* nothing to reset */
    }
  }
}

module.exports = { MongoRateLimitStore, RateLimitCounter: Counter };
