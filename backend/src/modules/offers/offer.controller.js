const asyncHandler = require("../../middleware/async");
const offerService = require("./offer.service");

// @desc    Make an offer or Buy Now (an offer at asking price)
// @route   POST /api/v1/offers
// @access  Private (buyer)
exports.makeOffer = asyncHandler(async (req, res) => {
  const offer = await offerService.makeOffer({
    buyer: req.user,
    productId: req.body.product,
    type: req.body.type,
    amountCents: req.body.amountCents,
    message: req.body.message,
  });
  res.status(201).json({ success: true, data: offer });
});

// @desc    List my offers (role=buyer by default, role=seller for received)
// @route   GET /api/v1/offers
// @access  Private
exports.listOffers = asyncHandler(async (req, res) => {
  const { offers, count, pagination } = await offerService.listOffers({
    user: req.user,
    role: req.query.role || "buyer",
    rawQuery: req.query,
  });
  res.status(200).json({ success: true, count, pagination, data: offers });
});

// @desc    Get one offer
// @route   GET /api/v1/offers/:id
// @access  Private (party)
exports.getOffer = asyncHandler(async (req, res) => {
  const offer = await offerService.getOfferForUser({
    offerId: req.params.id,
    user: req.user,
  });
  res.status(200).json({ success: true, data: offer });
});

// @desc    Full negotiation chain for an offer, oldest first
// @route   GET /api/v1/offers/:id/negotiation
// @access  Private (party)
exports.getNegotiation = asyncHandler(async (req, res) => {
  const offers = await offerService.getNegotiation({
    offerId: req.params.id,
    user: req.user,
  });
  res.status(200).json({ success: true, count: offers.length, data: offers });
});

// @desc    Respond to / withdraw a proposal
// @route   POST /api/v1/offers/:id/{accept|decline|counter|cancel}
// @access  Private (recipient for responses, proposer for cancel)
exports.acceptOffer = asyncHandler(async (req, res) => {
  const offer = await offerService.acceptOffer({
    offerId: req.params.id,
    user: req.user,
  });
  res.status(200).json({ success: true, data: offer });
});

exports.declineOffer = asyncHandler(async (req, res) => {
  const offer = await offerService.declineOffer({
    offerId: req.params.id,
    user: req.user,
  });
  res.status(200).json({ success: true, data: offer });
});

exports.counterOffer = asyncHandler(async (req, res) => {
  const offer = await offerService.counterOffer({
    offerId: req.params.id,
    user: req.user,
    amountCents: req.body.amountCents,
    message: req.body.message,
  });
  res.status(201).json({ success: true, data: offer });
});

exports.cancelOffer = asyncHandler(async (req, res) => {
  const offer = await offerService.cancelOffer({
    offerId: req.params.id,
    user: req.user,
  });
  res.status(200).json({ success: true, data: offer });
});
