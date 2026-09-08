# Shitblej

Shitblej is a full-stack marketplace for discovering, listing, negotiating, buying, and selling products.

The name comes from the Albanian words **shit** (“sell”) and **blej** (“buy”).

## Overview

Shitblej combines a versioned REST API, real-time marketplace events, and a responsive web application in one repository.

Key capabilities include:

- Product discovery, search, filtering, listings, and saved items
- User registration, authentication, and profile management
- Structured offers, counteroffers, acceptance, and checkout
- Purchase and sales order management
- Order-gated buyer and seller messaging
- Real-time updates with Socket.IO
- Cloudinary-backed image uploads
- English, Albanian and Serbian locale files (currently applied to the site chrome; most page copy is still English only)

## Repository structure

```text
shitblej/
├── backend/                   # Express API, Socket.IO, MongoDB, and tests
├── shitblej-frontend-web/     # React and Vite web application
├── e2e/                       # Playwright: a browser against the real stack
├── netlify.toml               # Web deployment configuration
└── README.md
```

## Technology

| Application | Main technologies |
| --- | --- |
| Backend | Node.js, Express 5, MongoDB, Mongoose, Socket.IO, JWT, Zod, Cloudinary |
| Web | React 19, Vite 7, React Router, Tailwind CSS, Axios, i18next, Swiper |
| Testing | Jest, Supertest, MongoDB Memory Server (backend); Vitest, React Testing Library (web); Playwright (end-to-end) |

## Marketplace workflow

Shitblej uses a structured transaction flow:

1. A buyer submits an offer on a listing.
2. The seller accepts, declines, or counters the offer.
3. The buyer completes checkout for an accepted offer.
4. Checkout creates the order using the agreed product and price.
5. Buyer and seller messaging becomes available for the accepted order.

Message authorization is a server responsibility. Client-side controls improve the experience but must not be treated as the security boundary.

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB, either locally or through MongoDB Atlas
- A Cloudinary account for image uploads — optional locally, see `UPLOAD_DRIVER` below

Clone the repository:

```bash
git clone https://github.com/endritbejta/shitblej.git
cd shitblej
```

### 1. Backend

Install dependencies and create the local environment file:

```bash
cd backend
npm install
cp .env.example .env
```

Configure `backend/.env`:

```env
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5174

MONGO_URI=mongodb://127.0.0.1:27017/shitblej

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRE=30d

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### Running without a Cloudinary account

Set `UPLOAD_DRIVER=local` and the Cloudinary variables become unnecessary:
uploads are written to `UPLOAD_DIR` (default `backend/.uploads`, gitignored)
and served back at `/uploads`, so a fresh clone can list a product without
signing up for anything.

```env
UPLOAD_DRIVER=local
```

The API refuses to start with this driver under `NODE_ENV=production`: on a
container platform the local disk is ephemeral and per instance, so images
would vanish on the next deploy and 404 on every instance except the one that
received the upload. Production uses `cloudinary`, which is the default.

`backend/.env.example` documents the optional variables too. Two matter when
deploying:

| Variable | Default | Why it matters |
| --- | --- | --- |
| `TRUST_PROXY_HOPS` | `0` | Number of reverse proxies in front of the app, used to resolve the real client IP for rate limiting. **Set to `1` behind Render, Heroku or a single Nginx ingress.** Left at `0` there, every request looks like it came from the proxy, so one client can exhaust the login limit for everybody. `0` is correct locally. |
| `NOTIFICATION_TTL_DAYS` | `90` | How long notifications are kept, enforced by a MongoDB TTL index. The first index build deletes anything older than the window; `0` disables expiry. |

Start the API:

```bash
npm run dev
```

The API is available at `http://localhost:3000/api/v1`.

Two probes, answering different questions:

| Endpoint | Question | Checks |
| --- | --- | --- |
| `GET /health` | Is the process alive? | Nothing external. A liveness probe that fails on a database blip gets the container restarted, which does not fix a database. |
| `GET /health/ready` | Should this instance be sent traffic? | Pings MongoDB and answers `503` when it cannot be reached, so a load balancer routes around the instance instead of requests failing one at a time. |

Logs are newline-delimited JSON (pretty-printed in development). Every request
carries an `X-Request-Id`, echoed back on the response and attached to every
log line for that request - including the error line - so a report can be
traced to its cause. An inbound `X-Request-Id` is adopted when it is
id-shaped, so a request keeps one identity across a proxy.

Authorization headers, cookies and anything named like a password or token are
redacted by the logger itself, so no call site can write a credential into a
log.

### 2. Web application

From the repository root:

```bash
cd shitblej-frontend-web
npm install
API_PROXY_TARGET=http://localhost:3000 npm run dev
```

Open `http://localhost:5174`.

The Vite development server proxies `/api` and `/socket.io` to `API_PROXY_TARGET`. When the variable is omitted, it uses the hosted API.

A production build does not use the proxy and needs the API origin instead:

```env
VITE_API_URL=https://your-api-host
```

The build fails without it rather than producing a bundle that requests
relative paths, so this must be set wherever the site is built. For Netlify it
lives in `netlify.toml` under `[build.environment]`. See
`shitblej-frontend-web/.env.example`.

## Available commands

### Backend

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with automatic reload |
| `npm start` | Start the API in production mode |
| `npm test` | Run the backend test suite |
| `npm run seed` | Import development seed data |
| `npm run seed:destroy` | Remove seeded data |

### Web

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the component and hook tests |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |

### End-to-end

Run from `e2e/`. Playwright starts the API and the web app itself.

| Command | Description |
| --- | --- |
| `npm run install:browsers` | Download Chromium (first time only) |
| `npm test` | Run the end-to-end suite |
| `npm run test:ui` | Step through a run in Playwright's UI mode |
| `npm run test:headed` | Watch it in a real browser window |
| `npm run report` | Open the report from the last run |

## API modules

The backend exposes feature modules under `/api/v1`:

- `/products`
- `/users`
- `/saved-items`
- `/offers`
- `/orders`
- `/messages`
- `/notifications`

Authentication is required for protected operations. Offers, checkout, orders, and messaging are validated by the backend rather than relying only on client state.

## Testing and quality

Run backend tests:

```bash
cd backend
npm test
```

Verify the web application:

```bash
cd shitblej-frontend-web
npm run lint
npm test
npm run build
```

Run the end-to-end suite — a real browser, against the real API, against a
real database:

```bash
cd e2e
npm run install:browsers   # first time only
npm test
```

Playwright starts everything itself: the Express app against an in-memory
MongoDB, and a production build of the web app served on a second origin (the
shape production has). Nothing is stubbed. See `e2e/README.md` for what it
covers and why it is set up that way.

Backend integration coverage includes users, products, saved items, offers, negotiation rules, orders, messages, image upload (through a real multipart request, using the local upload driver), rate limiting, caching, observability and the background sweeper.

| Suite | Where | Covers |
| --- | --- | --- |
| Backend | `backend/tests` | Express driven by supertest against an in-memory MongoDB |
| Web | `shitblej-frontend-web/src/**/*.test.{js,jsx}` | Components and hooks in jsdom, API client mocked |
| End-to-end | `e2e/tests` | Chromium against the real API and a real database, both origins |

The three are complementary rather than layered: the first two each see one
side of the wire, and the end-to-end suite exists for the failures that only
appear when the halves talk to each other — a security header that blocks an
image, an image URL that resolves against the wrong origin, a rate limiter
whose counters collide.

## Deployment

The web application includes a Netlify configuration that:

- builds from `shitblej-frontend-web`
- publishes the Vite `dist` directory
- redirects application routes to `index.html` for client-side routing

Production services must provide their own MongoDB, Cloudinary, JWT, CORS, API, and Socket.IO configuration. Never commit `.env` files or production credentials.

## Contributing

Run this once per clone, before your first commit:

```bash
git config core.hooksPath .githooks
```

That enables `.githooks/pre-commit`, which refuses to commit a credential -
env files with real values, connection strings with inline passwords, private
keys, provider tokens. It reads what is staged, so it catches the mistake
before it becomes a commit. `git commit --no-verify` bypasses it for a false
positive.

It exists because a real env file, carrying a live database URI and a JWT
secret, was committed to this public repository and stayed reachable in the
history until it was rewritten out. Two commits titled "security: remove
database credentials" deleted it from the working tree only, which does
nothing - the history keeps it. **If a credential is ever pushed, rotate it.
Deleting it in a later commit is not a fix.**

The hook is the last line of defence, not the first. GitHub's secret scanning
with push protection rejects a push server-side and cannot be skipped with
`--no-verify`; it is free on public repositories and worth enabling under
Settings -> Code security.

1. Create a focused branch from `main`.
2. Keep changes scoped to the relevant application.
3. Run the applicable tests, lint checks, and production build.
4. Open a pull request describing the behavior change and verification performed.

## License

The backend package is licensed under the MIT License. Add a repository-level `LICENSE` file before distributing the complete monorepo under a single license.
