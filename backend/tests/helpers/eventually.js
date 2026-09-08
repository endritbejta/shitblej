// Wait for an eventually-consistent side effect.
//
// Several things the API does are deliberately fire-and-forget: a notification
// or a chat card is written by a domain-event subscriber AFTER the response has
// been sent, precisely so a failure there can never fail the request (see
// shared/events/domainEvents.js). A test that reads such a row immediately
// after the response is racing the subscriber.
//
// The suite used to hide that race behind incidental delay - every test file
// booted its own in-memory MongoDB, and that second of startup was usually
// enough for the previous file's stragglers to land. Sharing one server removed
// the delay and the race became frequent, showing up as "expected a document,
// received null" on a different test each run.
//
// Polling rather than a fixed sleep: it returns as soon as the row appears
// (fast in the normal case) and only spends the timeout when something is
// genuinely wrong.

const DEFAULT_TIMEOUT_MS = 2000;
const POLL_INTERVAL_MS = 10;

// Resolve with the first truthy value `read` returns; throw if the timeout
// passes without one. `label` is used in the timeout message.
const eventually = async (read, { timeout = DEFAULT_TIMEOUT_MS, label } = {}) => {
  const deadline = Date.now() + timeout;
  let lastValue;

  for (;;) {
    lastValue = await read();
    if (lastValue) return lastValue;

    if (Date.now() >= deadline) {
      throw new Error(
        `eventually(${label || "condition"}) did not become truthy within ${timeout}ms ` +
          `(last value: ${JSON.stringify(lastValue)})`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
};

// Convenience for the common shape: wait for a Mongoose document to exist.
//   const notif = await eventuallyFindOne(Notification, { recipient: id });
const eventuallyFindOne = (Model, filter, options) =>
  eventually(() => Model.findOne(filter), {
    ...options,
    label: `${Model.modelName}.findOne(${JSON.stringify(filter)})`,
  });

module.exports = { eventually, eventuallyFindOne };
