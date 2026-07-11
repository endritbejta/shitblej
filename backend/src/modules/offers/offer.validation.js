const { z } = require("zod");
const { objectId } = require("../../shared/validators/common");
const { OFFER_STATUS, OFFER_TYPE, OFFER_PARTY } = require("./offer.constants");

const message = z.string().trim().max(500).optional();
// Amounts travel as integer cents, consistent with the orders domain.
const amountCents = z
  .number({ message: "amountCents must be a number" })
  .int("amountCents must be an integer (cents)")
  .positive("amountCents must be greater than 0");

exports.makeOfferSchema = {
  body: z
    .object({
      product: objectId("product"),
      type: z.enum(Object.values(OFFER_TYPE)),
      // Required for "offer", ignored for "buy_now" (server uses asking price).
      amountCents: amountCents.optional(),
      message,
    })
    .strip()
    .refine(
      (body) => body.type !== OFFER_TYPE.OFFER || body.amountCents !== undefined,
      { message: "amountCents is required when making an offer", path: ["amountCents"] }
    ),
};

exports.offerIdParamSchema = {
  params: z.object({ id: objectId("offer id") }),
};

exports.respondSchema = {
  params: z.object({ id: objectId("offer id") }),
  body: z.object({ message }).strip(),
};

exports.counterSchema = {
  params: z.object({ id: objectId("offer id") }),
  body: z.object({ amountCents, message }).strip(),
};

exports.listOffersSchema = {
  query: z.object({
    role: z.enum(Object.values(OFFER_PARTY)).optional(),
    status: z.enum(Object.values(OFFER_STATUS)).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
};
