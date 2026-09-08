# End-to-end tests

The browser, against the real API, against a real database.

Everything else in this repository tests one side of the wire. `backend/tests`
drives Express with supertest and never renders anything. The web suite renders
components against a mocked API client. Both can be green while the two halves
disagree — a renamed field, a changed envelope, a security header, an offer
state the UI has no branch for.

Nothing here is stubbed. `api-server.js` boots the same `app.js`, the same
routes, the same Mongoose models and the same Socket.IO server that production
runs, and Playwright builds the actual production bundle and serves it.

## Running

```bash
npm ci            # in e2e/, backend/ and shitblej-frontend-web/
npm run install:browsers
npm test
```

Also useful:

| Command | Does |
| --- | --- |
| `npm run test:ui` | Playwright's UI mode — step through a run |
| `npm run test:headed` | Watch it happen in a real window |
| `npm run report` | Open the HTML report from the last run |
| `npx playwright test tests/money-path.spec.js` | One file |

Playwright starts both servers itself; nothing needs to be running first. The
first run downloads a Chromium build and a `mongod` binary, both cached
afterwards.

## What runs where

```
 Playwright  ──drives──>  Chromium  ──http──>  vite preview :4173   (production build)
                                        │
                                        └──http/ws──>  api-server.js :4000
                                                             │
                                                             └──>  in-memory MongoDB
```

Two decisions worth knowing about:

**The built bundle, served cross-origin.** Not `vite dev`. The dev server
proxies `/api`, which makes everything same-origin and hides two whole classes
of problem: `VITE_API_URL` being wrong or missing (it is inlined at build time)
and anything CORS- or CORP-related. Production is Netlify talking to Render —
two origins — so the tests are two origins.

**`NODE_ENV=development`, not `test`.** `test` swaps the rate limiter for an
in-memory store with effectively no limit, and the point of an end-to-end run
is to exercise the middleware production actually has. The limits are raised
through `RATE_LIMIT_AUTH_MAX` / `RATE_LIMIT_API_MAX` instead, high enough that
repeats and retries never hit them and low enough that the limiter is still in
the request path. That is how the limiter's shared-counter bug was found.

Uploads use `UPLOAD_DRIVER=local` into a temp directory, so a test run never
touches Cloudinary.

## The rule the tests follow

**Whatever is being tested goes through the browser. Whatever is merely a
precondition can go through the API.**

So the money path lists an item through the Sell form, complete with a real
file upload — because listing is part of what it tests. It registers its two
users over HTTP, because a broken signup form should fail the signup test, not
every test in the file. Signing in through the UI is exercised once, on its
own, in `browsing.spec.js`.

## The suites

**`money-path.spec.js`** — list → offer → accept → checkout → chat, as two
people in two browser contexts. One long test on purpose: it is a journey, and
the interesting failures live in the handoffs. Two contexts rather than one
with a swapped token, because "the seller must not see the buyer's controls" is
part of the point.

It also pins the messaging gate, which is the platform's commercial interest:
chat is locked before any agreement, still locked while an offer is merely
pending, and unlocks on **acceptance** — not on checkout. That last one is
`message.policy.js`'s documented contract (an accepted offer inside its
checkout window is enough, so the pair can arrange handover before an order
exists).

**`browsing.spec.js`** — the cheap, broad checks. A guest sees listings, a
listing page reads without an account, a protected route redirects to sign-in
and comes back afterwards, an unknown route renders the 404 page. These are the
ones that would have caught the two whole-app failures this project has
actually had: a provider throwing during render and leaving a blank page, and a
build with no `VITE_API_URL` issuing requests against the static host.

## What this suite has already caught

Each of these was invisible to both existing test suites, and each is now
pinned by a unit test as well:

- **`Cross-Origin-Resource-Policy: same-origin`** from helmet on uploaded
  images. A clean `200` over curl, a blank thumbnail in the browser — the only
  symptom was an image that never appeared.
- **Root-relative image URLs.** `/uploads/x.png` resolves against whatever
  origin the page came from, which is the static host, not the API.
- **One rate-limit counter shared by both limiters.** An auth request passes
  through the blanket limiter and the auth limiter, and both wrote to the same
  document keyed by bare IP — so roughly ten requests of any kind from one
  address exhausted `authMax` and login returned 429 for the rest of the
  window. `express-rate-limit` had been reporting it as
  `ERR_ERL_DOUBLE_COUNT`, in a log nobody was reading.
- **A partial upload surviving a mid-write failure**, because cleanup was fire
  and forget. Passed on macOS, failed on Linux CI.

## Notes for writing more

- `expect.poll` on `naturalWidth` rather than `toBeVisible()` for images: the
  product page renders a mobile and a desktop gallery and hides one by
  viewport, so visibility says nothing about whether the bytes arrived.
- `getByLabel` matches the **label's text**, not the computed accessible name.
  The labels here render a decorative `*`, so `{ exact: true }` will not match;
  anchor with a regex instead. A bare `"Password"` also matches the "Show
  password" toggle's `aria-label`.
- Assert the response, not just the rendered bubble. The chat composer renders
  optimistically and reverts on failure, so a visibility check alone passes for
  a message the server refused.
- Message text with nine or more consecutive digits is rejected on purpose —
  the contact-details filter reads it as a phone number. Do not put a timestamp
  in a chat message.
- Serial, one worker: these tests share a database, and a marketplace listing
  is global state.
