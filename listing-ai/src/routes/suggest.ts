/**
 * POST /suggest - photo in, draft listing out.
 *
 * The route does four things and nothing else: validate, enforce the size cap,
 * delegate, and translate failures into the documented error shape. Anything
 * resembling a decision about listings belongs in ../analyze.
 */

import type { FastifyInstance, FastifyPluginOptions } from "fastify";

import type { Config } from "../config.js";
import { suggestRequestSchema, type ImageInput } from "../contracts/suggestion.js";
import {
  ERROR_STATUS,
  SUGGESTION_ERROR_CODES,
  SuggestionError,
} from "../errors.js";
import type { SuggestionService } from "../analyze/service.js";

export type SuggestRouteOptions = FastifyPluginOptions & {
  service: SuggestionService;
  config: Config;
};

/**
 * Decoded size of a base64 payload, without allocating the buffer to find out.
 * Every 4 characters encode 3 bytes; trailing '=' padding encodes nothing.
 */
export function base64ByteLength(data: string): number {
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return Math.floor((data.length * 3) / 4) - padding;
}

function assertWithinSizeLimit(image: ImageInput, maxBytes: number): void {
  if (image.kind !== "base64") return;

  const bytes = base64ByteLength(image.data);
  if (bytes > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(1);
    throw new SuggestionError(
      SUGGESTION_ERROR_CODES.INVALID_REQUEST,
      `Image is larger than the ${mb}MB limit.`,
    );
  }
}

export function registerSuggestRoute(
  app: FastifyInstance,
  { service, config }: SuggestRouteOptions,
): void {
  app.post("/suggest", async (request, reply) => {
    const startedAt = Date.now();

    const parsed = suggestRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");

      return reply.status(ERROR_STATUS[SUGGESTION_ERROR_CODES.INVALID_REQUEST]).send({
        error: { code: SUGGESTION_ERROR_CODES.INVALID_REQUEST, message: detail, retryable: false },
      });
    }

    try {
      assertWithinSizeLimit(parsed.data.image, config.MAX_IMAGE_BYTES);

      const { suggestion, cached } = await service.suggest({
        image: parsed.data.image,
        hint: parsed.data.hint,
      });

      return reply.send({
        suggestion,
        meta: { cached, model: service.model, latencyMs: Date.now() - startedAt },
      });
    } catch (error) {
      if (error instanceof SuggestionError) {
        // Logged at warn, not error: a rate limit or an unusable photo is the
        // system working as designed, and paging on it would train people to
        // ignore the alert.
        request.log.warn(
          { code: error.code, retryable: error.retryable, cause: error.cause },
          "suggestion failed",
        );

        return reply.status(ERROR_STATUS[error.code]).send({
          error: { code: error.code, message: error.message, retryable: error.retryable },
        });
      }

      // Genuinely unexpected: let Fastify's handler log the stack and return 500.
      throw error;
    }
  });
}
