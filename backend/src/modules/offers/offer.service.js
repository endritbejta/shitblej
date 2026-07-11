const mongoose = require("mongoose");
const Offer = require("./offer.model");
const Product = require("../products/product.model");
const inventory = require("../products/product.inventory");
const messageService = require("../messages/message.service");
const ErrorResponse = require("../../shared/utils/errorResponse");
const domainEvents = require("../../shared/events/domainEvents");
const { eurosToCents } = require("../../shared/utils/money");
const {
  parsePagination,
  buildPageLinks,
} = require("../../shared/utils/paginate");
const {
  OFFER_STATUS,
  OFFER_TYPE,
  OFFER_PARTY,
  OFFER_TTL_MS,
  CHECKOUT_TTL_MS,
  OFFER_EVENTS,
} = require("./offer.constants");

const PARTY_POPULATE = [
  { path: "buyer", select: "name image" },
  { path: "seller", select: "name image" },
];

const idOf = (ref) => String(ref && ref._id ? ref._id : ref);

const resolveParty = (offer, user) => {
  if (idOf(offer.buyer) === user.id) return OFFER_PARTY.BUYER;
  if (idOf(offer.seller) === user.id) return OFFER_PARTY.SELLER;
  if (user.role === "admin") return "admin";
  return null;
};

// The party allowed to respond to a proposal is always the one who did NOT
// make it.
const recipientOf = (offer) =>
  offer.proposedBy === OFFER_PARTY.BUYER
    ? OFFER_PARTY.SELLER
    : OFFER_PARTY.BUYER;

const userIdForParty = (offer, party) =>
  party === OFFER_PARTY.BUYER ? idOf(offer.buyer) : idOf(offer.seller);

const emitOfferEvent = (eventName, offer, recipientId, extra = {}) => {
  domainEvents.publish(eventName, {
    offerId: offer._id.toString(),
    negotiationRoot: idOf(offer.negotiationRoot),
    productId: idOf(offer.product),
    productName: offer.productName,
    buyerId: idOf(offer.buyer),
    sellerId: idOf(offer.seller),
    proposedBy: offer.proposedBy,
    type: offer.type,
    status: offer.status,
    amountCents: offer.amountCents,
    currency: offer.currency,
    recipientId: String(recipientId),
    ...extra,
  });
};

// Every negotiation step also lands in the conversation between the two
// users, so chat is the negotiation hub. Failures here must never undo a
// committed negotiation step - log and continue.
const postOfferMessage = async (offer, senderId, receiverId) => {
  try {
    await messageService.createOfferMessage({
      sender: senderId,
      receiver: receiverId,
      offer,
    });
  } catch (err) {
    console.error("Failed to post offer message to chat:", err.message);
  }
};

// Lazy expiration: negotiation code never trusts a stale `pending`.
const expireIfDue = async (offer) => {
  if (offer.status !== OFFER_STATUS.PENDING) return offer;
  if (offer.expiresAt > new Date()) return offer;

  const expired = await Offer.findOneAndUpdate(
    { _id: offer._id, status: OFFER_STATUS.PENDING },
    { $set: { status: OFFER_STATUS.EXPIRED, respondedAt: new Date() } },
    { new: true }
  );
  if (expired) {
    emitOfferEvent(
      OFFER_EVENTS.EXPIRED,
      expired,
      userIdForParty(expired, expired.proposedBy)
    );
    return expired;
  }
  return Offer.findById(offer._id);
};

// @desc Start a negotiation: a buyer proposes a price (or Buy Now at asking
// price - the seller must consent to every sale).
exports.makeOffer = async ({ buyer, productId, type, amountCents, message }) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new ErrorResponse(`Product not found with id of ${productId}`, 404);
  }
  if (product.status !== inventory.PRODUCT_STATUS.AVAILABLE) {
    throw new ErrorResponse("This product is no longer available", 409);
  }
  if (!product.user) {
    throw new ErrorResponse("This product cannot be purchased (no seller)", 409);
  }
  if (String(product.user) === buyer.id) {
    throw new ErrorResponse("You cannot make an offer on your own product", 400);
  }

  const askingPriceCents = eurosToCents(product.price);
  const proposedCents =
    type === OFFER_TYPE.BUY_NOW ? askingPriceCents : amountCents;

  if (type === OFFER_TYPE.OFFER) {
    if (!proposedCents) {
      throw new ErrorResponse("Please provide an offer amount", 400);
    }
    if (proposedCents > askingPriceCents) {
      throw new ErrorResponse(
        "An offer cannot exceed the asking price - use Buy Now instead",
        400
      );
    }
  }

  // Friendly guard; the partial unique index is the real protection.
  const active = await Offer.findOne({
    product: productId,
    buyer: buyer.id,
    status: OFFER_STATUS.PENDING,
  });
  if (active) {
    throw new ErrorResponse(
      "You already have an active offer on this product",
      409
    );
  }

  // Root offers reference themselves as negotiationRoot; assigning the id
  // up front avoids a second write.
  const _id = new mongoose.Types.ObjectId();
  let offer;
  try {
    offer = await Offer.create({
      _id,
      negotiationRoot: _id,
      product: product._id,
      productName: product.name,
      productImage: product.images && product.images[0],
      askingPriceCents,
      buyer: buyer.id,
      seller: product.user,
      proposedBy: OFFER_PARTY.BUYER,
      type,
      amountCents: proposedCents,
      message,
      expiresAt: new Date(Date.now() + OFFER_TTL_MS),
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new ErrorResponse(
        "You already have an active offer on this product",
        409
      );
    }
    throw err;
  }

  await offer.populate(PARTY_POPULATE);
  await postOfferMessage(offer, buyer.id, idOf(offer.seller));
  emitOfferEvent(OFFER_EVENTS.PLACED, offer, idOf(offer.seller));
  return offer;
};

// Load an offer, authorize the user as a party, and apply lazy expiration.
const loadForParty = async (offerId, user) => {
  const offer = await Offer.findById(offerId);
  if (!offer) {
    throw new ErrorResponse(`Offer not found with id of ${offerId}`, 404);
  }
  const party = resolveParty(offer, user);
  if (!party) {
    throw new ErrorResponse("Not authorized to access this offer", 403);
  }
  return { offer: await expireIfDue(offer), party };
};

const assertRespondable = (offer, party) => {
  if (offer.status !== OFFER_STATUS.PENDING) {
    throw new ErrorResponse(
      `This offer is ${offer.status} and can no longer be responded to`,
      409
    );
  }
  const recipient = recipientOf(offer);
  if (party !== recipient && party !== "admin") {
    throw new ErrorResponse(
      "Only the party who received this proposal can respond to it",
      403
    );
  }
};

// @desc Accept the current proposal: reserve the item, close rival offers,
// open the checkout window. This is the moment "agreement" exists.
exports.acceptOffer = async ({ offerId, user }) => {
  const { offer, party } = await loadForParty(offerId, user);
  assertRespondable(offer, party);

  // Reserve first: agreement is meaningless if the item is already claimed.
  const reserved = await inventory.reserveProduct(offer.product);
  if (!reserved) {
    throw new ErrorResponse(
      "This product is no longer available, so the offer cannot be accepted",
      409
    );
  }

  const accepted = await Offer.findOneAndUpdate(
    { _id: offer._id, status: OFFER_STATUS.PENDING },
    {
      $set: {
        status: OFFER_STATUS.ACCEPTED,
        respondedAt: new Date(),
        checkoutExpiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
      },
    },
    { new: true }
  ).populate(PARTY_POPULATE);

  if (!accepted) {
    // A concurrent response won the race - undo the reservation.
    await inventory.releaseProducts([offer.product]);
    throw new ErrorResponse(
      "The offer was modified by another request. Reload and try again.",
      409
    );
  }

  // The item is spoken for: close every other live proposal on it, whoever
  // the buyer is, and tell those buyers.
  const rivals = await Offer.find({
    product: accepted.product,
    status: OFFER_STATUS.PENDING,
    _id: { $ne: accepted._id },
  }).select("_id buyer seller product productName amountCents");
  if (rivals.length > 0) {
    await Offer.updateMany(
      { _id: { $in: rivals.map((r) => r._id) } },
      { $set: { status: OFFER_STATUS.DECLINED, respondedAt: new Date() } }
    );
    rivals.forEach((rival) =>
      emitOfferEvent(OFFER_EVENTS.SUPERSEDED, accepted, idOf(rival.buyer), {
        supersededOfferId: rival._id.toString(),
      })
    );
  }

  const proposerId = userIdForParty(accepted, accepted.proposedBy);
  await postOfferMessage(accepted, user.id, proposerId);
  emitOfferEvent(OFFER_EVENTS.ACCEPTED, accepted, proposerId);
  return accepted;
};

// @desc Decline the current proposal. Ends this branch; the other party may
// open a fresh offer later.
exports.declineOffer = async ({ offerId, user }) => {
  const { offer, party } = await loadForParty(offerId, user);
  assertRespondable(offer, party);

  const declined = await Offer.findOneAndUpdate(
    { _id: offer._id, status: OFFER_STATUS.PENDING },
    { $set: { status: OFFER_STATUS.DECLINED, respondedAt: new Date() } },
    { new: true }
  ).populate(PARTY_POPULATE);
  if (!declined) {
    throw new ErrorResponse(
      "The offer was modified by another request. Reload and try again.",
      409
    );
  }

  const proposerId = userIdForParty(declined, declined.proposedBy);
  await postOfferMessage(declined, user.id, proposerId);
  emitOfferEvent(OFFER_EVENTS.DECLINED, declined, proposerId);
  return declined;
};

// @desc Counter the current proposal: close it as "countered" and create a
// new pending proposal with the roles flipped. The chain is append-only.
exports.counterOffer = async ({ offerId, user, amountCents, message }) => {
  const { offer, party } = await loadForParty(offerId, user);
  assertRespondable(offer, party);

  if (!amountCents) {
    throw new ErrorResponse("Please provide a counter amount", 400);
  }
  if (amountCents > offer.askingPriceCents) {
    throw new ErrorResponse("A counter cannot exceed the asking price", 400);
  }

  // Close the parent BEFORE inserting the child so the single-active-offer
  // index is never violated. If we crash in between, no proposal is live and
  // either party can simply start again - safe by construction.
  const countered = await Offer.findOneAndUpdate(
    { _id: offer._id, status: OFFER_STATUS.PENDING },
    { $set: { status: OFFER_STATUS.COUNTERED, respondedAt: new Date() } },
    { new: true }
  );
  if (!countered) {
    throw new ErrorResponse(
      "The offer was modified by another request. Reload and try again.",
      409
    );
  }

  const responderParty = party === "admin" ? recipientOf(offer) : party;
  const counter = await Offer.create({
    product: offer.product,
    productName: offer.productName,
    productImage: offer.productImage,
    askingPriceCents: offer.askingPriceCents,
    buyer: offer.buyer,
    seller: offer.seller,
    proposedBy: responderParty,
    type: OFFER_TYPE.OFFER,
    amountCents,
    message,
    previousOffer: offer._id,
    negotiationRoot: offer.negotiationRoot,
    expiresAt: new Date(Date.now() + OFFER_TTL_MS),
  });

  await counter.populate(PARTY_POPULATE);
  const recipientId = userIdForParty(counter, recipientOf(counter));
  await postOfferMessage(counter, user.id, recipientId);
  emitOfferEvent(OFFER_EVENTS.COUNTERED, counter, recipientId);
  return counter;
};

// @desc The proposer backs out of their own live proposal.
exports.cancelOffer = async ({ offerId, user }) => {
  const { offer, party } = await loadForParty(offerId, user);
  if (offer.status !== OFFER_STATUS.PENDING) {
    throw new ErrorResponse(
      `This offer is ${offer.status} and can no longer be cancelled`,
      409
    );
  }
  if (party !== offer.proposedBy && party !== "admin") {
    throw new ErrorResponse("Only the proposer can cancel this offer", 403);
  }

  const cancelled = await Offer.findOneAndUpdate(
    { _id: offer._id, status: OFFER_STATUS.PENDING },
    { $set: { status: OFFER_STATUS.CANCELLED, respondedAt: new Date() } },
    { new: true }
  ).populate(PARTY_POPULATE);
  if (!cancelled) {
    throw new ErrorResponse(
      "The offer was modified by another request. Reload and try again.",
      409
    );
  }

  const recipientId = userIdForParty(cancelled, recipientOf(cancelled));
  await postOfferMessage(cancelled, user.id, recipientId);
  emitOfferEvent(OFFER_EVENTS.CANCELLED, cancelled, recipientId);
  return cancelled;
};

// @desc One offer, party-only.
exports.getOfferForUser = async ({ offerId, user }) => {
  const { offer } = await loadForParty(offerId, user);
  await offer.populate(PARTY_POPULATE);
  return offer;
};

// @desc The full negotiation chain, oldest first.
exports.getNegotiation = async ({ offerId, user }) => {
  const { offer } = await loadForParty(offerId, user);
  return Offer.find({ negotiationRoot: offer.negotiationRoot })
    .sort("createdAt")
    .populate(PARTY_POPULATE);
};

// @desc List the user's offers from either side of the table.
exports.listOffers = async ({ user, role, rawQuery = {} }) => {
  const filter =
    role === OFFER_PARTY.SELLER ? { seller: user.id } : { buyer: user.id };
  if (rawQuery.status) filter.status = rawQuery.status;

  const { page, limit, skip } = parsePagination(rawQuery);
  const [offers, total] = await Promise.all([
    Offer.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate(PARTY_POPULATE),
    Offer.countDocuments(filter),
  ]);

  return {
    offers,
    count: offers.length,
    total,
    pagination: buildPageLinks({ page, limit, skip, total, returned: offers.length }),
  };
};

// @desc Sweep for a scheduler: expire overdue proposals and release
// reservations held by accepted offers whose checkout window lapsed.
// (Lazy checks in the hot paths make this a cleanup, not a correctness need.)
exports.expireOffers = async (now = new Date()) => {
  const overdue = await Offer.find({
    status: OFFER_STATUS.PENDING,
    expiresAt: { $lte: now },
  }).select("_id buyer seller product productName proposedBy amountCents negotiationRoot type currency status");
  for (const offer of overdue) {
    await expireIfDue(offer);
  }

  const staleAgreements = await Offer.find({
    status: OFFER_STATUS.ACCEPTED,
    order: { $exists: false },
    checkoutExpiresAt: { $lte: now },
  });
  for (const offer of staleAgreements) {
    const expired = await Offer.findOneAndUpdate(
      { _id: offer._id, status: OFFER_STATUS.ACCEPTED, order: { $exists: false } },
      { $set: { status: OFFER_STATUS.EXPIRED } },
      { new: true }
    );
    if (expired) {
      await inventory.releaseProducts([expired.product]);
      emitOfferEvent(OFFER_EVENTS.EXPIRED, expired, idOf(expired.buyer));
    }
  }

  return { expiredPending: overdue.length, expiredAgreements: staleAgreements.length };
};

// Internal API for the orders module (checkout): claim an accepted offer.
// Kept here so all offer-state knowledge stays in the offers service.
exports.consumeAcceptedOffer = async ({ offerId, buyerId, orderId }) => {
  return Offer.findOneAndUpdate(
    {
      _id: offerId,
      buyer: buyerId,
      status: OFFER_STATUS.ACCEPTED,
      order: { $exists: false },
    },
    { $set: { order: orderId } },
    { new: true }
  );
};
