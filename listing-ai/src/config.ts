/**
 * Environment parsing. Read once at boot, exported as a frozen object, so
 * nothing downstream reaches into `process.env` and no module has to decide
 * what a missing variable means.
 */

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  /**
   * Optional on purpose. Without a key the service still boots, `/health`
   * reports `degraded`, and `/suggest` returns 503 with a clear reason. A
   * listing assistant is an assist, not a gate: the Sell form has to keep
   * working when this service cannot answer, and a crash-on-boot would take the
   * whole container down instead of one optional feature.
   */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  ANTHROPIC_MODEL: z.string().default("claude-opus-5"),

  /**
   * Effort trades thinking depth against cost and latency. `medium` is the
   * default because the job is mostly perception plus a pricing judgement, and
   * `high` did not change the answers enough in the eval set to justify the
   * spend. Raise it if the price bands start looking careless.
   */
  ANTHROPIC_EFFORT: z.enum(["low", "medium", "high"]).default("medium"),

  /**
   * Generous relative to the ~600 tokens a draft needs, because adaptive
   * thinking draws from the same budget and a truncated response is a wasted
   * paid call.
   */
  MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(8000),

  /** Cloudinary's own limit is 10MB; 5MB of raw bytes is a sane request cap. */
  MAX_IMAGE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),

  /**
   * The cache exists to stop a seller who taps "suggest" three times from
   * paying three times. Entries are small, so the ceiling is about bounding
   * memory, not about hit rate.
   */
  CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(500),
  CACHE_TTL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 1000),

  /**
   * Comma-separated origins allowed to call this service directly. Empty means
   * same-origin only, which is the right default: in production the marketplace
   * backend proxies these calls, so the browser never talks to this service.
   */
  ALLOWED_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

export type Config = Readonly<z.infer<typeof envSchema>>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    // Fail loudly and specifically. A service that boots with a malformed PORT
    // and listens somewhere unexpected is harder to debug than one that refuses.
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return Object.freeze(parsed.data);
}
