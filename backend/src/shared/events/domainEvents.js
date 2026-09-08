const { EventEmitter } = require("events");

// In-process domain event bus.
//
// Services emit facts about what happened ("orders.placed") after a state
// change is durably persisted; side-effect consumers (notifications, sockets,
// analytics, audit) subscribe without the producing service knowing about
// them. This keeps modules decoupled and gives a single seam to swap in a
// real broker (Redis streams, SQS, etc.) if the app outgrows one process.
//
// Contract:
// - Emit AFTER the database write succeeds, never before.
// - Payloads must be plain, serializable data - never a live mongoose
//   document. A handler may relay a payload straight onto a socket, so
//   anything carrying getters, virtuals or a database session would either
//   serialize unpredictably or keep a document alive past its request.
//   Most payloads are therefore ids and primitives; where a consumer needs a
//   whole record to deliver (messages and notifications go out over the
//   socket verbatim) it is detached with .toObject() first.
// - Handlers may throw or reject freely; the bus contains both so a broken
//   listener can never fail the request that emitted the event.
class DomainEventBus extends EventEmitter {
  publish(eventName, payload) {
    // Listeners are invoked one at a time rather than through emit(), because
    // emit() only propagates SYNCHRONOUS throws - an async handler's rejection
    // escapes the try/catch entirely and surfaces as an unhandledRejection,
    // which server.js turns into process.exit(1). Every subscriber happened to
    // catch its own errors, so the contract held by discipline; here it holds
    // by construction.
    for (const listener of this.listeners(eventName)) {
      try {
        const result = listener(payload);
        if (result && typeof result.then === "function") {
          result.catch((err) => {
            console.error(
              `Domain event handler failed for "${eventName}":`,
              err && err.message
            );
          });
        }
      } catch (err) {
        console.error(
          `Domain event handler failed for "${eventName}":`,
          err && err.message
        );
      }
    }
  }
}

module.exports = new DomainEventBus();
