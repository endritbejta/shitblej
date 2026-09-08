const domainEvents = require("../../shared/events/domainEvents");
const logger = require("../../shared/logger");
const Offer = require("./offer.model");
const { OFFER_STATUS, OFFER_EVENTS } = require("./offer.constants");
const { PRODUCT_EVENTS } = require("../products/product.events");

// When a seller deletes a listing, every live proposal on it becomes
// meaningless - close them and tell the buyers. Reacting to the event keeps
// the products module unaware that offers exist (no dependency cycle).
let registered = false;

const register = () => {
  if (registered) return;
  registered = true;

  domainEvents.on(PRODUCT_EVENTS.DELETED, async ({ productId }) => {
    try {
      const pending = await Offer.find({
        product: productId,
        status: OFFER_STATUS.PENDING,
      });
      if (pending.length === 0) return;

      await Offer.updateMany(
        { _id: { $in: pending.map((o) => o._id) } },
        { $set: { status: OFFER_STATUS.CANCELLED, respondedAt: new Date() } }
      );

      pending.forEach((offer) =>
        domainEvents.publish(OFFER_EVENTS.CANCELLED, {
          offerId: offer._id.toString(),
          productId: String(offer.product),
          productName: offer.productName,
          amountCents: offer.amountCents,
          currency: offer.currency,
          type: offer.type,
          status: OFFER_STATUS.CANCELLED,
          buyerId: String(offer.buyer),
          sellerId: String(offer.seller),
          proposedBy: offer.proposedBy,
          negotiationRoot: String(offer.negotiationRoot),
          recipientId: String(offer.buyer),
          reason: "listing_deleted",
        })
      );
    } catch (err) {
      logger.error({ err, productId }, "failed to cancel offers for deleted product");
    }
  });
};

module.exports = { register };
