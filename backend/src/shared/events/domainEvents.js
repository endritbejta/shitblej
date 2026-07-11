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
// - Payloads carry plain ids and primitives, not live mongoose documents.
// - Handlers must not throw; the bus logs and swallows handler errors so a
//   broken listener can never fail the request that emitted the event.
class DomainEventBus extends EventEmitter {
  publish(eventName, payload) {
    try {
      this.emit(eventName, payload);
    } catch (err) {
      console.error(`Domain event handler failed for "${eventName}":`, err);
    }
  }
}

module.exports = new DomainEventBus();
