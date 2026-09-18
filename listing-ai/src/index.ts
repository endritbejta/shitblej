/**
 * Process entry point: read config, wire dependencies, listen, shut down
 * cleanly. All the decisions live in the modules this imports.
 */

import { loadConfig } from "./config.js";
import { ClaudeListingAnalyzer } from "./analyze/analyzer.js";
import { createSuggestionService } from "./analyze/service.js";
import { buildServer } from "./server.js";

const config = loadConfig();

// A missing key is a degraded deploy, not a failed one - see BuildServerOptions.
const service = config.ANTHROPIC_API_KEY
  ? createSuggestionService(new ClaudeListingAnalyzer(config), config)
  : undefined;

const app = buildServer({ config, service });

if (!service) {
  app.log.warn(
    "ANTHROPIC_API_KEY is not set - /suggest will return 503 and /health will report degraded",
  );
}

// SIGTERM is what a container runtime sends on deploy or scale-down. Closing
// lets in-flight suggestions finish instead of returning a truncated response
// to a seller mid-request.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, "shutting down");
    void app.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
}

try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch (error) {
  app.log.fatal(error, "failed to start");
  process.exit(1);
}
