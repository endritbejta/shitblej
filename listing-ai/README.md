# Listing AI

A seller photographs the thing they want to sell. This service turns that photo
into a draft listing — title, description, category, condition, brand, size and
a price range — shaped so it drops straight into the Sell form.

It is an assist, not a gate. Every field it returns is editable, and when the
service is unconfigured, rate-limited or down, the Sell form keeps working
exactly as it did before.

## Why it is a separate service

The model call is slow, costs money per request, and fails in ways the rest of
the API does not — rate limits, safety declines, schema drift. Putting it behind
its own contract keeps those failure modes out of `POST /api/v1/products`, and
lets the marketplace API degrade to "suggestions unavailable" instead of
degrading to "cannot list an item".

It lives in this repository rather than its own so there is one clone, one CI
workflow and one place to read the whole marketplace.

## API

### `POST /suggest`

```jsonc
{
  "image": {
    "kind": "base64",              // the Sell form, before anything is uploaded
    "mediaType": "image/jpeg",     // jpeg | png | webp | gif
    "data": "<base64, no data: prefix>"
  },
  "hint": "Nike Air Max, size 42"  // optional; whatever the seller already typed
}
```

`image` may instead be `{ "kind": "url", "url": "https://…" }` for a listing
whose photo is already hosted.

```jsonc
{
  "suggestion": {
    "name": "Nike Air Max 90 — size 42",
    "description": "Black Nike Air Max 90 in good condition. Some creasing…",
    "category": "men",
    "condition": "Used - Good",
    "brand": "Nike",                 // omitted when not legible in the photo
    "size": "42",                    // omitted when not legible in the photo
    "price": {
      "low": 30,
      "suggested": 45,
      "high": 60,
      "currency": "EUR",
      "basis": "model_estimate",
      "comparablesUsed": 0,
      "confidence": "medium"
    },
    "warnings": ["The photo is dark, so condition is a rough guess."]
  },
  "meta": { "cached": false, "model": "claude-opus-5", "latencyMs": 4120 }
}
```

`warnings` is always present and often empty. A consumer that ignores it still
gets a valid listing; a consumer that shows it gives the seller a reason to look
twice before posting.

### Errors

Every failure returns `{ "error": { "code", "message", "retryable" } }`.

| Code | Status | Meaning |
| --- | --- | --- |
| `invalid_request` | 400 | Malformed body, unsupported media type, or image over the size cap |
| `refused` | 422 | The model declined to describe this image |
| `rate_limited` | 429 | Upstream rate limit — retry with backoff |
| `upstream_invalid` | 502 | The model returned something that did not fit the schema |
| `upstream_error` | 502 | Upstream or network failure |
| `not_configured` | 503 | No API key on this server; the feature is off, not broken |

`retryable` is the field to branch on. It separates "this photo will never work"
from "try again in a moment".

### `GET /health`

`{"status":"ok"}` when configured, `{"status":"degraded","detail":"…"}` when not.
Both return 200 — the process is healthy either way, and a readiness probe that
kills the container over a missing optional feature is worse than the feature
being missing.

## Running it

```bash
npm install
cp .env.example .env     # add ANTHROPIC_API_KEY
npm run dev
```

Without a key the service still boots: `/health` reports `degraded` and
`/suggest` returns 503. That is the intended local experience for anyone working
on the marketplace who does not need this feature.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Watch mode |
| `npm run typecheck` | `tsc --noEmit` across src, tests and evals |
| `npm test` | Vitest — offline, no API key, no cost |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled build |
| `npm run eval` | Quality run against real fixtures — **makes billed calls** |

## Layout

```
src/
├─ domain/taxonomy.ts    Categories, conditions and field limits, mirrored from
│                        the backend and guarded by tests/taxonomy.test.ts
├─ contracts/            Request and response schemas — the whole API surface
├─ analyze/
│  ├─ prompt.ts          The system prompt, built once, never interpolated
│  ├─ analyzer.ts        The only file that knows Anthropic exists
│  ├─ normalize.ts       Model draft → postable listing. Pure, heavily tested
│  ├─ cache.ts           Content-addressed LRU, so a retry is free
│  └─ service.ts         Cache + analyzer
├─ routes/suggest.ts     Validate, size-check, delegate, map errors
├─ errors.ts             The failure vocabulary and its HTTP mapping
└─ server.ts             Fastify wiring, no listen() — tests inject()
```

The interesting file is `normalize.ts`. Everything a language model does that a
form cannot accept — a 70-character title, a price range returned backwards, a
brand of `""` — is absorbed there, as a warning rather than an error, and pinned
by unit tests that need no API key.

## Two things worth knowing

**The price is an estimate, and says so.** The marketplace currently holds about
31 listings, three or four per category. A "similar items sold for €X" figure
computed from three comparables would be precision the data cannot support, and
sellers price real possessions off these numbers. So `basis` is
`model_estimate`, `comparablesUsed` is `0`, and the UI should label it that way.
The `comparable_sales` basis is already in the contract: when there are enough
closed orders, that path fills in and consumers that already branch on `basis`
need no change.

**The taxonomy is a copy with a tripwire.** Categories, conditions and length
limits are duplicated from `backend/src/modules/products/product.validation.js`,
because the backend is CommonJS and this service is ESM TypeScript. A category
this service invents is not a poor suggestion, it is a 400 the seller has to fix
by hand — so `tests/taxonomy.test.ts` reads the backend's validation file and
fails when the two drift.

## Evals

`npm run eval` scores suggestions against the marketplace's own seed catalogue
(`backend/_data/products.json`) — 28 items across all nine categories. It
reports category accuracy, condition distance on the five-point scale, whether
the catalogue's price falls inside the suggested band, and contract validity.

```bash
npm run eval -- --limit 5          # while iterating
npm run eval -- --concurrency 3
```

What it measures, stated plainly: agreement with the catalogue's own labels.
Those labels are what the seeder's author chose rather than ground truth about
the photographs, and the fixtures are stock images rather than the phone
snapshots real sellers upload. A high score means "consistent with how this
marketplace already describes things", which is the right first proxy and not
the same as "correct". Swap in real seller photos once there are enough.

Only hard failures gate the run — an error, or a suggestion that violates the
contract. There is no measured baseline for the quality numbers yet, so
asserting a threshold would mean inventing one.

## Cost

One vision call per suggestion, billed per token. To measure it for your own
traffic, read `usage` off the response in `analyzer.ts` rather than trusting an
estimate here — image token counts vary a lot with resolution.

Three things already keep it down: repeat requests for the same photo are served
from an in-process cache and cost nothing; `ANTHROPIC_EFFORT` defaults to
`medium` rather than `high`; and the system prompt is byte-identical on every
request, so it is the natural cache prefix. Whether that prefix actually caches
depends on the model's minimum cacheable length — this prompt sits near that
threshold, so watch `usage.cache_read_input_tokens` rather than assuming it.
