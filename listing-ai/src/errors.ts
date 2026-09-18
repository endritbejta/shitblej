/**
 * The failure vocabulary this service speaks.
 *
 * Every error a caller can see is one of these codes, and the route layer maps
 * code to HTTP status in one place. That matters more than usual here: the
 * marketplace backend proxies this service, and it needs to tell "the seller
 * sent a bad photo" (show them a message) from "the model is rate-limited"
 * (retry, or quietly hide the feature) without parsing prose.
 */

export const SUGGESTION_ERROR_CODES = {
  /** Request failed validation, or the image exceeded the configured size cap. */
  INVALID_REQUEST: "invalid_request",
  /** No ANTHROPIC_API_KEY configured. The feature is off, not broken. */
  NOT_CONFIGURED: "not_configured",
  /** Upstream rate limit. Retryable, with backoff. */
  RATE_LIMITED: "rate_limited",
  /** The model declined the request on safety grounds. */
  REFUSED: "refused",
  /** Upstream returned something we could not parse into a draft. */
  UPSTREAM_INVALID: "upstream_invalid",
  /** Upstream error or network failure. Retryable. */
  UPSTREAM_ERROR: "upstream_error",
} as const;

export type SuggestionErrorCode =
  (typeof SUGGESTION_ERROR_CODES)[keyof typeof SUGGESTION_ERROR_CODES];

export class SuggestionError extends Error {
  readonly code: SuggestionErrorCode;
  /** True when the same request could succeed shortly. Drives the caller's retry. */
  readonly retryable: boolean;

  constructor(
    code: SuggestionErrorCode,
    message: string,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "SuggestionError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}

/**
 * The status each code maps to. Kept as data so the route stays a lookup and a
 * new code cannot quietly default to 500.
 */
export const ERROR_STATUS: Record<SuggestionErrorCode, number> = {
  [SUGGESTION_ERROR_CODES.INVALID_REQUEST]: 400,
  [SUGGESTION_ERROR_CODES.NOT_CONFIGURED]: 503,
  [SUGGESTION_ERROR_CODES.RATE_LIMITED]: 429,
  [SUGGESTION_ERROR_CODES.REFUSED]: 422,
  [SUGGESTION_ERROR_CODES.UPSTREAM_INVALID]: 502,
  [SUGGESTION_ERROR_CODES.UPSTREAM_ERROR]: 502,
};
