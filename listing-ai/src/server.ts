/**
 * Builds the Fastify app.
 *
 * Separate from index.ts and never calls `listen()`, so tests can drive the real
 * routing stack through `app.inject()` without binding a port.
 */

import Fastify, { type FastifyInstance } from "fastify";

import type { Config } from "./config.js";
import type { SuggestionService } from "./analyze/service.js";
import { SUGGESTION_ERROR_CODES } from "./errors.js";
import { registerSuggestRoute } from "./routes/suggest.js";

export type BuildServerOptions = {
  config: Config;
  /**
   * Undefined when ANTHROPIC_API_KEY is missing. The service still serves
   * /health so a deploy stays observable and a readiness probe gets an honest
   * answer; /suggest then reports that the feature is unconfigured rather than
   * pretending to work.
   */
  service?: SuggestionService | undefined;
};

export function buildServer({ config, service }: BuildServerOptions): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    // Base64 images inflate the JSON body past Fastify's 1MB default. The
    // headroom over MAX_IMAGE_BYTES covers base64's ~33% overhead plus the
    // envelope, so an oversized image is rejected by our own check with a clear
    // message instead of by the parser with a generic 413.
    bodyLimit: Math.ceil(config.MAX_IMAGE_BYTES * 1.4) + 64 * 1024,
  });

  app.get("/health", async () => ({
    status: service ? "ok" : "degraded",
    // Naming the missing piece means a failing readiness check does not require
    // reading the source to interpret.
    detail: service ? undefined : "ANTHROPIC_API_KEY is not configured",
    model: service?.model,
  }));

  if (service) {
    registerSuggestRoute(app, { service, config });
  } else {
    app.post("/suggest", async (_request, reply) =>
      reply.status(503).send({
        error: {
          code: SUGGESTION_ERROR_CODES.NOT_CONFIGURED,
          message: "Listing suggestions are not configured on this server.",
          retryable: false,
        },
      }),
    );
  }

  return app;
}
