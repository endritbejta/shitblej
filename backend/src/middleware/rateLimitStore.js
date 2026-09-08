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
    // The store's prefix plus the client key express-rate-limit hands us (an
    // IP, by default), used directly as _id so an increment is a single
    // primary-key upsert. The prefix is what keeps each limiter's counters
    // separate - see the constructor.
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

// Regex-escape, for the prefix scan in resetAll.
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class MongoRateLimitStore {
  // express-rate-limit sets this to tell us the keys are shared, not
  // per-process, which is the entire point.
  localKeys = false;

  /**
   * @param {object} opts
   * @param {string} opts.prefix namespace for this limiter's counters.
   *
   * The prefix is not cosmetic. Every limiter used to write to the same
   * document, keyed by bare IP - and an auth request passes through BOTH the
   * blanket /api/v1 limiter and the tighter auth limiter, so:
   *
   *   - one request counted twice, spending the auth allowance at double
   *     rate, and
   *   - far worse, the two tiers shared a single counter. Ordinary browsing
   *     incremented the number the auth limiter reads, so roughly ten
   *     requests of ANY kind from one address exhausted authMax and login
   *     returned 429 for the rest of the window.
   *
   * express-rate-limit was in fact reporting this (ERR_ERL_DOUBLE_COUNT); it
   * reads `store.prefix` when checking whether a key was counted twice for
   * one request, which is why this field is public and part of the key.
   */
  constructor({ prefix = "" } = {}) {
    this.prefix = prefix;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  keyFor(key) {
    return `${this.prefix}${key}`;
  }

  // One atomic document update does the whole decision, so concurrent
  // requests cannot both "start" a window and lose a count between them.
  // Both branches read the pre-update `expiresAt`, because every expression in
  // a single $set stage is evaluated against the incoming document.
  async increment(key) {
    try {
      const doc = await Counter.findOneAndUpdate(
        { _id: this.keyFor(key) },
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
        { _id: this.keyFor(key), expiresAt: { $gt: new Date() }, hits: { $gt: 0 } },
        { $inc: { hits: -1 } }
      );
    } catch {
      /* a lost decrement only makes the limit very slightly stricter */
    }
  }

  async resetKey(key) {
    try {
      await Counter.deleteOne({ _id: this.keyFor(key) });
    } catch {
      /* nothing to reset */
    }
  }

  async resetAll() {
    try {
      // This limiter's counters only - another limiter's window is not ours
      // to clear.
      await Counter.deleteMany(
        this.prefix ? { _id: new RegExp(`^${escapeRegExp(this.prefix)}`) } : {}
      );
    } catch {
      /* nothing to reset */
    }
  }
}

module.exports = { MongoRateLimitStore, RateLimitCounter: Counter };
