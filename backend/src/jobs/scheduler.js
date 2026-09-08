const config = require("../config");
const offerService = require("../modules/offers/offer.service");

// Background maintenance.
//
// The negotiation hot paths already expire lazily: nothing reads a stale
// `pending` offer and no expired agreement can be checked out. But lazy
// checks only fire when somebody touches the offer, and the case that matters
// most is precisely the one where nobody does - a buyer who agrees a price and
// never returns. Without a sweep, that product stays `reserved` forever: it
// cannot be sold (offers report `product_unavailable`) and it cannot be
// deleted (the listing delete refuses to orphan a live commitment).
//
// So this is not a correctness backstop for the request paths; it is the only
// thing that releases abandoned reservations.

let timer = null;
let running = false;

// One sweep. Never throws: a failed sweep must not take the process down, and
// the next tick retries anyway.
const runSweep = async () => {
  // Skip if the previous sweep is still going, so a slow pass cannot pile up.
  if (running) return null;
  running = true;
  try {
    const result = await offerService.expireOffers();
    if (result.expiredPending > 0 || result.expiredAgreements > 0) {
      console.log(
        `Offer sweep: expired ${result.expiredPending} pending, released ${result.expiredAgreements} stale agreement(s)`
      );
    }
    return result;
  } catch (err) {
    console.error("Offer sweep failed:", err.message);
    return null;
  } finally {
    running = false;
  }
};

// Start the periodic sweep. Idempotent, so a double call cannot end up with
// two timers racing each other.
const start = ({ intervalMs = config.jobs.offerSweepIntervalMs } = {}) => {
  if (timer) return timer;

  // Sweep once at boot: the process may have been down across a window that
  // lapsed, and those reservations are already overdue for release.
  runSweep();

  timer = setInterval(runSweep, intervalMs);
  // Don't hold the event loop open - the server's lifetime decides shutdown.
  if (timer.unref) timer.unref();
  return timer;
};

const stop = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

module.exports = { start, stop, runSweep };
