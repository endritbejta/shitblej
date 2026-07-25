# Shitblej

Shitblej is a full-stack marketplace for discovering, listing, negotiating, buying, and selling products across web and mobile.

The name comes from the Albanian words **shit** (“sell”) and **blej** (“buy”).

## Overview

Shitblej combines a versioned REST API, real-time marketplace events, a responsive web application, and an Expo mobile client in one repository.

Key capabilities include:

- Product discovery, search, filtering, listings, and saved items
- User registration, authentication, and profile management
- Structured offers, counteroffers, acceptance, and checkout
- Purchase and sales order management
- Order-gated buyer and seller messaging
- Real-time updates with Socket.IO
- Cloudinary-backed image uploads
- English, Albanian, and Serbian web localization

## Repository structure

```text
shitblej/
├── backend/                   # Express API, Socket.IO, MongoDB, and tests
├── frontend mobile/           # React Native application powered by Expo
├── shitblej-frontend-web/     # React and Vite web application
├── netlify.toml               # Web deployment configuration
└── README.md
```

## Technology

| Application | Main technologies |
| --- | --- |
| Backend | Node.js, Express 5, MongoDB, Mongoose, Socket.IO, JWT, Zod, Cloudinary |
| Web | React 19, Vite 7, React Router, Tailwind CSS, Axios, i18next, Swiper |
| Mobile | React Native, Expo 52, Expo Router, NativeWind, Axios |
| Testing | Jest, Supertest, MongoDB Memory Server |

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
- A Cloudinary account for image uploads
- Expo Go, an iOS Simulator, or an Android Emulator for mobile development

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

Start the API:

```bash
npm run dev
```

The API is available at `http://localhost:3000/api/v1`. Its health endpoint is `http://localhost:3000/health`.

### 2. Web application

From the repository root:

```bash
cd shitblej-frontend-web
npm install
API_PROXY_TARGET=http://localhost:3000 npm run dev
```

Open `http://localhost:5174`.

The Vite development server proxies `/api` and `/socket.io` to `API_PROXY_TARGET`. When the variable is omitted, it uses the hosted API.

### 3. Mobile application

From the repository root:

```bash
cd "frontend mobile"
npm install
npm start
```

Use the Expo terminal controls to open the project on iOS, Android, the web, or a physical device with Expo Go.

When testing against a local API from a physical device, use the development machine’s LAN address rather than `localhost`, and ensure both devices are on the same network.

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
| `npm run lint` | Run ESLint |

### Mobile

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo development server |
| `npm run ios` | Open the iOS development target |
| `npm run android` | Open the Android development target |
| `npm run web` | Open the Expo web target |
| `npm run lint` | Run Expo linting |
| `npm test` | Run Jest in watch mode |

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
npm run build
```

Backend integration coverage includes users, products, saved items, offers, negotiation rules, orders, and messages.

## Deployment

The web application includes a Netlify configuration that:

- builds from `shitblej-frontend-web`
- publishes the Vite `dist` directory
- redirects application routes to `index.html` for client-side routing

Production services must provide their own MongoDB, Cloudinary, JWT, CORS, API, and Socket.IO configuration. Never commit `.env` files or production credentials.

## Contributing

1. Create a focused branch from `main`.
2. Keep changes scoped to the relevant application.
3. Run the applicable tests, lint checks, and production build.
4. Open a pull request describing the behavior change and verification performed.

## License

The backend package is licensed under the MIT License. Add a repository-level `LICENSE` file before distributing the complete monorepo under a single license.
