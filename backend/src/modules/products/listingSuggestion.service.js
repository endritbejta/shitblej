const config = require("../../config");
const logger = require("../../shared/logger");
const ErrorResponse = require("../../shared/utils/errorResponse");

// Client for the listing-ai service (see listing-ai/README.md).
//
// This is the only place in the API that knows that service exists. It does
// three things: forward the request, translate the other service's error
// vocabulary into our envelope, and make sure a slow or absent suggestion
// service can never hold an API worker open indefinitely.
//
// Nothing here retries. The upstream marks its own errors `retryable`, and the
// caller that knows whether a retry is worth it is the browser - a seller who
// can see the spinner and decide - not a request handler holding a socket.

// Upstream code -> the status and message we return.
//
// The upstream's messages are written for a developer reading logs; these are
// written for a seller looking at a form. Where the two would say the same
// thing there is no reason to differ, but "the model declined to describe this
// image" is not a sentence to put in front of a user.
const UPSTREAM_ERRORS = {
  invalid_request: {
    status: 400,
    message: "That image could not be used. Try a different photo.",
  },
  not_configured: {
    status: 503,
    message: "Listing suggestions are unavailable right now.",
  },
  rate_limited: {
    status: 429,
    message: "Too many suggestions requested. Please try again shortly.",
  },
  refused: {
    status: 422,
    message:
      "We could not generate a listing from that image. Try another photo of the item.",
  },
  upstream_invalid: {
    status: 502,
    message: "The suggestion service returned an unexpected response.",
  },
  upstream_error: {
    status: 502,
    message: "The suggestion service is having trouble. Please try again.",
  },
};

const UNAVAILABLE = new ErrorResponse(
  "Listing suggestions are unavailable right now.",
  503,
  "suggestions_unavailable"
);

// `fetch` rejects with a DOMException named "TimeoutError" when the signal
// fires, and a TypeError when the host is unreachable. Both mean the same
// thing to a caller: the service did not answer.
const isUnreachable = (error) =>
  error instanceof TypeError || error?.name === "TimeoutError" || error?.name === "AbortError";

/**
 * Ask listing-ai for a draft listing.
 *
 * @param {object} params
 * @param {{kind: "base64", mediaType: string, data: string}} params.image
 * @param {string} [params.hint] Whatever the seller has already typed.
 * @returns {Promise<{suggestion: object, meta: object}>}
 */
exports.requestSuggestion = async ({ image, hint }) => {
  if (!config.listingAi.enabled) {
    throw UNAVAILABLE;
  }

  let response;
  try {
    response = await fetch(`${config.listingAi.url}/suggest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image, ...(hint ? { hint } : {}) }),
      // Without this the request inherits Node's default of no timeout, and a
      // hung suggestion service would pin an API worker until the client gave
      // up - which is how one optional feature takes the whole API down.
      signal: AbortSignal.timeout(config.listingAi.timeoutMs),
    });
  } catch (error) {
    if (isUnreachable(error)) {
      logger.warn(
        { err: error, url: config.listingAi.url },
        "listing-ai unreachable"
      );
      throw UNAVAILABLE;
    }
    throw error;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const code = payload?.error?.code;
    const mapped = UPSTREAM_ERRORS[code];

    logger.warn(
      { status: response.status, code, upstreamMessage: payload?.error?.message },
      "listing-ai returned an error"
    );

    if (!mapped) {
      // An unrecognised code means the two services have drifted. Say so in
      // the logs; tell the seller something actionable.
      throw new ErrorResponse(
        "The suggestion service returned an unexpected response.",
        502,
        "suggestion_failed"
      );
    }

    throw new ErrorResponse(mapped.message, mapped.status, code);
  }

  if (!payload?.suggestion) {
    logger.warn({ payload }, "listing-ai returned a body with no suggestion");
    throw new ErrorResponse(
      "The suggestion service returned an unexpected response.",
      502,
      "suggestion_failed"
    );
  }

  return payload;
};
