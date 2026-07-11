const express = require("express");
const router = express.Router();
const { z } = require("zod");
const {
  makeOffer,
  listOffers,
  getOffer,
  getOfferOptions,
  getNegotiation,
  acceptOffer,
  declineOffer,
  counterOffer,
  cancelOffer,
} = require("./offer.controller");
const { objectId } = require("../../shared/validators/common");
const { protect } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const {
  makeOfferSchema,
  offerIdParamSchema,
  respondSchema,
  counterSchema,
  listOffersSchema,
} = require("./offer.validation");

router.use(protect);

// @route   POST /api/v1/offers            (make offer / buy now)
// @route   GET  /api/v1/offers?role=buyer|seller&status=...
router.post("/", validate(makeOfferSchema), makeOffer);
router.get("/", validate(listOffersSchema), listOffers);

// Negotiation envelope for the offer UI (slider bounds, quick picks).
// Declared before "/:id" so "options" is not captured as an id.
// @route   GET /api/v1/offers/options?product=:id
router.get(
  "/options",
  validate({ query: z.object({ product: objectId("product") }) }),
  getOfferOptions
);

// @route   GET /api/v1/offers/:id
// @route   GET /api/v1/offers/:id/negotiation
router.get("/:id", validate(offerIdParamSchema), getOffer);
router.get("/:id/negotiation", validate(offerIdParamSchema), getNegotiation);

// Negotiation actions. Who may do what is enforced by the offers service:
// only the proposal's recipient may accept/decline/counter; only the
// proposer may cancel.
router.post("/:id/accept", validate(respondSchema), acceptOffer);
router.post("/:id/decline", validate(respondSchema), declineOffer);
router.post("/:id/counter", validate(counterSchema), counterOffer);
router.post("/:id/cancel", validate(respondSchema), cancelOffer);

module.exports = router;
